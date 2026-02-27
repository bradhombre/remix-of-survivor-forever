
CREATE OR REPLACE FUNCTION public.delete_league(league_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only the league owner can delete
  IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE id = league_uuid AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the league owner can delete this league';
  END IF;

  -- Get all game session IDs for this league
  -- Delete session-dependent data first
  DELETE FROM public.scoring_events WHERE session_id IN (SELECT id FROM public.game_sessions WHERE league_id = league_uuid);
  DELETE FROM public.contestants WHERE session_id IN (SELECT id FROM public.game_sessions WHERE league_id = league_uuid);
  DELETE FROM public.draft_order WHERE session_id IN (SELECT id FROM public.game_sessions WHERE league_id = league_uuid);
  DELETE FROM public.player_profiles WHERE session_id IN (SELECT id FROM public.game_sessions WHERE league_id = league_uuid);
  DELETE FROM public.final_predictions WHERE session_id IN (SELECT id FROM public.game_sessions WHERE league_id = league_uuid);
  DELETE FROM public.crying_contestants WHERE session_id IN (SELECT id FROM public.game_sessions WHERE league_id = league_uuid);

  -- Delete league-dependent data
  DELETE FROM public.game_sessions WHERE league_id = league_uuid;
  DELETE FROM public.chat_messages WHERE league_id = league_uuid;
  DELETE FROM public.scoring_templates WHERE league_id = league_uuid;
  DELETE FROM public.archived_seasons WHERE league_id = league_uuid;
  DELETE FROM public.league_teams WHERE league_id = league_uuid;
  DELETE FROM public.league_memberships WHERE league_id = league_uuid;

  -- Delete the league itself
  DELETE FROM public.leagues WHERE id = league_uuid;
END;
$function$;
