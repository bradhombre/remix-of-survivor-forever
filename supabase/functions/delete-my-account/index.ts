import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = user.id;

    // 1. Nullify user_id on league_teams (free up team slots)
    await supabaseAdmin
      .from("league_teams")
      .update({ user_id: null })
      .eq("user_id", userId);

    // 2. Delete from league_memberships
    await supabaseAdmin
      .from("league_memberships")
      .delete()
      .eq("user_id", userId);

    // 3. Delete from user_roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    // 4. Delete from user_player_mapping
    await supabaseAdmin
      .from("user_player_mapping")
      .delete()
      .eq("user_id", userId);

    // 5. Handle owned leagues
    const { data: ownedLeagues } = await supabaseAdmin
      .from("leagues")
      .select("id")
      .eq("owner_id", userId);

    if (ownedLeagues && ownedLeagues.length > 0) {
      for (const league of ownedLeagues) {
        // Check if any other members remain
        const { data: otherMembers } = await supabaseAdmin
          .from("league_memberships")
          .select("user_id, role")
          .eq("league_id", league.id)
          .neq("user_id", userId)
          .limit(10);

        if (!otherMembers || otherMembers.length === 0) {
          // No other members — delete the league and its data
          await supabaseAdmin
            .from("game_sessions")
            .delete()
            .eq("league_id", league.id);
          await supabaseAdmin
            .from("league_teams")
            .delete()
            .eq("league_id", league.id);
          await supabaseAdmin
            .from("chat_messages")
            .delete()
            .eq("league_id", league.id);
          await supabaseAdmin
            .from("scoring_templates")
            .delete()
            .eq("league_id", league.id);
          await supabaseAdmin
            .from("archived_seasons")
            .delete()
            .eq("league_id", league.id);
          await supabaseAdmin.from("leagues").delete().eq("id", league.id);
        } else {
          // Transfer ownership to the first league_admin, or first member
          const newOwner =
            otherMembers.find((m) => m.role === "league_admin") ||
            otherMembers[0];
          await supabaseAdmin
            .from("leagues")
            .update({ owner_id: newOwner.user_id })
            .eq("id", league.id);
        }
      }
    }

    // 6. Delete from profiles
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // 7. Delete contact from Customer.io
    const cioSiteId = "87d8fe6f98e8d1f436f8";
    const cioApiKey = Deno.env.get("CIO_TRACK_API_KEY");
    if (cioApiKey) {
      const cioCredentials = btoa(`${cioSiteId}:${cioApiKey}`);
      await fetch(`https://track.customer.io/api/v1/customers/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${cioCredentials}`,
          "Content-Type": "application/json",
        },
      });
    }

    // 8. Delete from auth.users
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
