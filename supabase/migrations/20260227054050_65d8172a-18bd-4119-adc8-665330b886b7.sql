CREATE OR REPLACE FUNCTION public.rename_team_everywhere(
  _league_id uuid,
  _team_id uuid,
  _old_name text,
  _new_name text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _session_id uuid;
BEGIN
  -- Update the team name
  UPDATE league_teams SET name = _new_name WHERE id = _team_id;

  -- Find the active game session for this league
  SELECT id INTO _session_id
  FROM game_sessions
  WHERE league_id = _league_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF _session_id IS NOT NULL THEN
    -- Update draft order
    UPDATE draft_order
    SET player_name = _new_name
    WHERE session_id = _session_id AND player_name = _old_name;

    -- Update contestant owners
    UPDATE contestants
    SET owner = _new_name
    WHERE session_id = _session_id AND owner = _old_name;
  END IF;
END;
$$;