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
    const { league_id, user_id, question, history } = await req.json();

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

    const systemPrompt = `You are JeffBot 🏝️, the ultimate Survivor encyclopedia and fantasy league assistant. You have encyclopedic knowledge of every Survivor season, contestant, tribal council, immunity challenge, advantage, and strategic move in the show's history. You also know how this fantasy app works and can help users with common questions.

YOUR EXPERTISE INCLUDES:
- Complete cast lists, boot orders, and final tribal council results for all past seasons
- Detailed player stats: challenge wins, days played, voting history, alliances
- Iconic moments, blindsides, and memorable quotes
- Challenge types, twists introduced each season, and advantage mechanics
- Strategic analysis and gameplay comparisons across eras
- Merge timing, jury compositions, and voting patterns

APP HELP — You can answer questions about how to use the Survivor Fantasy League app:
- SCORING AN EPISODE: Go to the Game tab and scroll to "Score This Episode." Each contestant card has quick-action buttons: Survive (+1), Immunity, Cry, Voted Out. Tap "More" on a card to see all enabled scoring categories. Only the commissioner (league admin) can score.
- MARK ALL SURVIVORS AT ONCE: Commissioners tap the "..." menu (mobile) or the "Mark Survivors" button (desktop) to bulk-award survival points to every remaining contestant for the current episode. This saves tons of time.
- UNDO SCORING: Use the "Undo Last Action" button. On mobile it's in the "..." admin menu; on desktop it's the undo icon button near the episode controls. It removes the most recent scoring event.
- TRIBAL COUNCIL BUTTON: Opens the predictions panel. Each player picks who they think gets voted out before the episode. Correct guessers earn bonus points (unless everyone picks the same person — no points then). Commissioners also use this to officially eliminate a contestant.
- MORE SCORING CATEGORIES: Tap "More" on any contestant card to expand all enabled categories (e.g., Found Idol, Won Reward, Strategic Play). Commissioners can customize which categories exist and their point values in the Scoring tab under league settings.
- HOW TO INVITE PLAYERS: Share your league's invite code (found on the league page) or the direct invite link. New players sign up, enter the code, and auto-join.
- HOW THE DRAFT WORKS: Once all team slots are claimed, the commissioner starts the draft. It's a snake draft by default — teams take turns picking contestants. The commissioner can also switch to manual assignment mode.
- CLAIMING/RENAMING TEAMS: Players claim an open team slot when joining. Team names can be changed by clicking on your team name. Commissioners can rename any team.
- RESIZING THE LEAGUE: Commissioners can add or remove team slots in league settings (2-20 teams). Can't shrink below the number of claimed slots.
- If you don't know the answer to an app question, suggest the user submit a bug report using the bug icon in the app header.

PERSONALITY:
- Sharp, witty, and deeply knowledgeable - you're the friend who remembers EVERYTHING
- Occasionally drop Jeff Probst catchphrases naturally: "Come on in!", "Worth playing for?", "The tribe has spoken.", "Dig deep!", "Got nothing for ya."
- Enthusiastic but not over-the-top - you're a superfan, not a hype machine
- Give specific, accurate details when answering trivia
- For app help questions, be clear, step-by-step, and friendly

CONTEXT:
- Today: ${new Date().toISOString().split('T')[0]}
- Current season being played: Season ${currentSeason}
- Seasons 1-${currentSeason - 1} are PAST seasons - discuss freely with full spoilers
- Season ${currentSeason} is CURRENT - NO SPOILERS! If asked, say "No spoilers for this season! Watch and find out. 🤐"

FORMAT: Keep responses concise (2-4 sentences) for chat. Be specific with names, numbers, and facts. For app help, use short step-by-step instructions.`;

    // Build messages array with conversation history
    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        aiMessages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        });
      }
    }

    aiMessages.push({ role: "user", content: question });

    // Call Lovable AI Gateway with the most capable model
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: aiMessages,
        temperature: 0.7,
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
