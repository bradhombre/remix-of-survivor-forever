import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { league_id, user_id, question } = await req.json();

    if (!league_id || !user_id || !question) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: league_id, user_id, question" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch current season from the league's game session
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("season")
      .eq("league_id", league_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (sessionError) {
      console.error("Error fetching game session:", sessionError);
    }

    const currentSeason = session?.season || 49;

    const systemPrompt = `You are JeffBot, a friendly Survivor superfan assistant. You know everything about Survivor history, past seasons, challenges, player stats, and trivia. You speak casually with occasional Jeff Probst catchphrases like "Come on in!", "Worth playing for?", "The tribe has spoken.", "Got nothing for you.", or "Dig deep!"

IMPORTANT CONTEXT:
- Today's date is ${new Date().toISOString().split('T')[0]}
- The CURRENT season being played is Season ${currentSeason}
- All seasons numbered LESS than ${currentSeason} are PAST seasons that have already aired - you CAN and SHOULD discuss them freely including winners, boot orders, memorable moments, etc.
- For example: Seasons 1-${currentSeason - 1} are all past seasons you have full knowledge about.

CRITICAL RULE: You must NEVER reveal any information about Season ${currentSeason} (the current season) including cast, boot order, challenges, advantages, or winner. If asked about Season ${currentSeason}, say something like "No spoilers! You'll have to watch and find out. The tribe has spoken... but I haven't!"

Keep responses brief (2-3 sentences max) since this is a chat. Be enthusiastic about Survivor!`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const botResponse = aiData.choices?.[0]?.message?.content || "The tribe has spoken... but I'm speechless! Try again?";

    // Insert bot message using service role
    const { error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        league_id,
        user_id,
        content: botResponse.slice(0, 500), // Ensure within limit
        is_bot: true,
      });

    if (insertError) {
      console.error("Error inserting bot message:", insertError);
      throw new Error("Failed to save bot response");
    }

    return new Response(
      JSON.stringify({ success: true, response: botResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("JeffBot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
