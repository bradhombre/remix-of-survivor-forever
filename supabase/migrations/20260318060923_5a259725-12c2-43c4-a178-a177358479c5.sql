
CREATE OR REPLACE FUNCTION public.remove_league_member(_league_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _team_name text;
  _session_id uuid;
BEGIN
  -- Only league admins or super admins can remove members
  IF NOT (has_league_role(auth.uid(), _league_id, ARRAY['league_admin', 'super_admin']) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only league admins can remove members';
  END IF;

  -- Cannot remove yourself
  IF auth.uid() = _user_id THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;

  -- Get the team name for this user
  SELECT name INTO _team_name
  FROM league_teams
  WHERE league_id = _league_id AND user_id = _user_id;

  -- Get the active game session
  SELECT id INTO _session_id
  FROM game_sessions
  WHERE league_id = _league_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Nullify team assignment
  UPDATE league_teams SET user_id = NULL
  WHERE league_id = _league_id AND user_id = _user_id;

  -- Clean up game data if we have a session and team name
  IF _session_id IS NOT NULL AND _team_name IS NOT NULL THEN
    DELETE FROM draft_order
    WHERE session_id = _session_id AND player_name = _team_name;

    UPDATE contestants SET owner = NULL, pick_number = NULL
    WHERE session_id = _session_id AND owner = _team_name;

    -- Reset draft state to avoid broken mid-draft
    UPDATE game_sessions
    SET current_draft_index = 0, mode = 'setup'
    WHERE id = _session_id AND mode = 'draft';
  END IF;

  -- Delete membership
  DELETE FROM league_memberships
  WHERE league_id = _league_id AND user_id = _user_id;
END;
$$;
