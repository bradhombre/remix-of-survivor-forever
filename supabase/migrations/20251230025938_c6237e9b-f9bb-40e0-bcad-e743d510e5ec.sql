-- Function to join a league via invite code
CREATE OR REPLACE FUNCTION public.join_league(invite_code_input TEXT)
RETURNS public.league_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_league public.leagues;
  new_membership public.league_memberships;
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

  -- Insert as player
  INSERT INTO public.league_memberships (league_id, user_id, role)
  VALUES (target_league.id, auth.uid(), 'player')
  RETURNING * INTO new_membership;

  RETURN new_membership;
END;
$$;