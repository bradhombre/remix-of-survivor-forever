-- Update join_league to auto-assign users to next available team slot
CREATE OR REPLACE FUNCTION public.join_league(invite_code_input text)
RETURNS league_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_league public.leagues;
  new_membership public.league_memberships;
  available_team public.league_teams;
BEGIN
  -- Find league by invite code (case insensitive)
  SELECT * INTO target_league
  FROM public.leagues
  WHERE invite_code = UPPER(invite_code_input);

  IF target_league IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.league_memberships 
    WHERE league_id = target_league.id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already a member of this league';
  END IF;

  -- Find next available team slot
  SELECT * INTO available_team
  FROM public.league_teams
  WHERE league_id = target_league.id AND user_id IS NULL
  ORDER BY position
  LIMIT 1;

  IF available_team IS NULL THEN
    RAISE EXCEPTION 'League is full - no available slots';
  END IF;

  -- Insert as player
  INSERT INTO public.league_memberships (league_id, user_id, role)
  VALUES (target_league.id, auth.uid(), 'player')
  RETURNING * INTO new_membership;

  -- Auto-assign to team slot
  UPDATE public.league_teams
  SET user_id = auth.uid()
  WHERE id = available_team.id;

  RETURN new_membership;
END;
$$;

-- Create resize_league function for admins
CREATE OR REPLACE FUNCTION public.resize_league(league_uuid uuid, new_size integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  filled_count integer;
  i integer;
BEGIN
  -- Verify admin access
  IF NOT has_league_role(auth.uid(), league_uuid, ARRAY['league_admin', 'super_admin']) AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only league admins can resize the league';
  END IF;

  -- Validate size
  IF new_size < 2 OR new_size > 20 THEN
    RAISE EXCEPTION 'League size must be between 2 and 20';
  END IF;

  -- Get current team count
  SELECT COUNT(*) INTO current_count FROM league_teams WHERE league_id = league_uuid;
  SELECT COUNT(*) INTO filled_count FROM league_teams WHERE league_id = league_uuid AND user_id IS NOT NULL;

  -- Cannot shrink below filled slots
  IF new_size < filled_count THEN
    RAISE EXCEPTION 'Cannot shrink league below % (current members)', filled_count;
  END IF;

  -- Delete empty slots if shrinking
  IF new_size < current_count THEN
    DELETE FROM league_teams 
    WHERE league_id = league_uuid 
      AND user_id IS NULL 
      AND position > new_size;
    
    -- Reorder remaining positions
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_pos
      FROM league_teams
      WHERE league_id = league_uuid
    )
    UPDATE league_teams lt
    SET position = numbered.new_pos
    FROM numbered
    WHERE lt.id = numbered.id;
  END IF;

  -- Add new slots if growing
  IF new_size > current_count THEN
    FOR i IN (current_count + 1)..new_size LOOP
      INSERT INTO league_teams (league_id, name, position)
      VALUES (league_uuid, 'Team ' || i, i);
    END LOOP;
  END IF;

  -- Update league team_count
  UPDATE leagues SET team_count = new_size WHERE id = league_uuid;
END;
$$;