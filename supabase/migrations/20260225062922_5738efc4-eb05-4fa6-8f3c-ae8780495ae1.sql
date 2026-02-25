
CREATE OR REPLACE FUNCTION public.execute_draft_pick(
  _session_id uuid,
  _contestant_id uuid,
  _owner text,
  _pick_number integer,
  _expected_index integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_index integer;
BEGIN
  -- Lock the session row to prevent concurrent picks
  SELECT current_draft_index INTO current_index
  FROM game_sessions WHERE id = _session_id FOR UPDATE;

  -- Optimistic lock: only proceed if index matches expectation
  IF current_index != _expected_index THEN
    RETURN false;
  END IF;

  -- Assign contestant
  UPDATE contestants SET owner = _owner, pick_number = _pick_number
  WHERE id = _contestant_id AND session_id = _session_id;

  -- Increment draft index
  UPDATE game_sessions SET current_draft_index = _expected_index + 1
  WHERE id = _session_id;

  RETURN true;
END;
$$;
