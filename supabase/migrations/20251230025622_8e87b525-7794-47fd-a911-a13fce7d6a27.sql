
-- Drop the constraint (not the index)
ALTER TABLE public.league_memberships 
DROP CONSTRAINT IF EXISTS league_memberships_league_id_user_id_key;

-- Recreate as partial unique index for non-null league_ids
CREATE UNIQUE INDEX IF NOT EXISTS league_memberships_league_id_user_id_key 
ON public.league_memberships (league_id, user_id) 
WHERE league_id IS NOT NULL;

-- Add unique constraint for super_admins (null league_id)
CREATE UNIQUE INDEX IF NOT EXISTS league_memberships_super_admin_user_id_key 
ON public.league_memberships (user_id) 
WHERE league_id IS NULL AND role = 'super_admin';

-- Function to generate random 6-character invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to create a league with game session
CREATE OR REPLACE FUNCTION public.create_league(league_name TEXT)
RETURNS public.leagues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_league public.leagues;
  invite TEXT;
BEGIN
  -- Generate unique invite code
  LOOP
    invite := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.leagues WHERE invite_code = invite);
  END LOOP;

  -- Insert the league (trigger will auto-add owner as league_admin)
  INSERT INTO public.leagues (name, owner_id, invite_code)
  VALUES (league_name, auth.uid(), invite)
  RETURNING * INTO new_league;

  -- Create a game session in setup mode for the league
  INSERT INTO public.game_sessions (league_id, mode, season, episode)
  VALUES (new_league.id, 'setup', 49, 1);

  RETURN new_league;
END;
$$;

-- Function to make a user super_admin
CREATE OR REPLACE FUNCTION public.make_super_admin(user_uuid UUID)
RETURNS public.league_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_membership public.league_memberships;
BEGIN
  -- Only existing super_admins or app admins can create super_admins
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only super_admins or app admins can create super_admins';
  END IF;

  INSERT INTO public.league_memberships (league_id, user_id, role)
  VALUES (NULL, user_uuid, 'super_admin')
  ON CONFLICT DO NOTHING
  RETURNING * INTO new_membership;

  RETURN new_membership;
END;
$$;
