-- Security + Season 51 fixes (2026-09-25)
--
-- 1. Only a platform-level row (league_id IS NULL) makes someone a super admin.
--    Before this, any commissioner could edit their own league membership to
--    role = 'super_admin' and get platform admin rights (see every user's email,
--    create/delete users, change anyone's login email).
-- 2. Commissioners can no longer hand out the super_admin role.
-- 3. Archived seasons (History) are scoped to the league. Before this, any
--    signed-in user could read or delete every league's history.
-- 4. New leagues start on the "current season" from /admin > Settings
--    instead of a hardcoded Season 50.

-- 1 -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_memberships
    WHERE user_id = _user_id
      AND role = 'super_admin'
      AND league_id IS NULL
  )
$$;

-- 2 -------------------------------------------------------------------------
DROP POLICY IF EXISTS "League admins can update member roles" ON public.league_memberships;
CREATE POLICY "League admins can update member roles"
ON public.league_memberships
FOR UPDATE
USING (
  public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    role IN ('player', 'league_admin')
    AND public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  )
);

DROP POLICY IF EXISTS "League admins can add members" ON public.league_memberships;
CREATE POLICY "League admins can add members"
ON public.league_memberships
FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    role IN ('player', 'league_admin')
    AND public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  )
);

-- 3 -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage archived seasons" ON public.archived_seasons;
DROP POLICY IF EXISTS "Authenticated users can view archived seasons" ON public.archived_seasons;
DROP POLICY IF EXISTS "League members can view archived seasons" ON public.archived_seasons;
DROP POLICY IF EXISTS "League admins can archive seasons" ON public.archived_seasons;
DROP POLICY IF EXISTS "League admins can delete archived seasons" ON public.archived_seasons;

CREATE POLICY "League members can view archived seasons"
ON public.archived_seasons
FOR SELECT
USING (
  public.is_league_member(auth.uid(), league_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "League admins can archive seasons"
ON public.archived_seasons
FOR INSERT
WITH CHECK (
  public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "League admins can delete archived seasons"
ON public.archived_seasons
FOR DELETE
USING (
  public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR public.is_super_admin(auth.uid())
);

-- 4 -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_league(league_name text)
 RETURNS leagues
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_league public.leagues;
  invite TEXT;
  i INTEGER;
  start_season INTEGER;
BEGIN
  SELECT COALESCE(
    (SELECT substring(value from '\d{1,4}')::int
       FROM public.app_settings WHERE key = 'current_season'),
    51
  ) INTO start_season;

  LOOP
    invite := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.leagues WHERE invite_code = invite);
  END LOOP;

  INSERT INTO public.leagues (name, owner_id, invite_code, team_count)
  VALUES (league_name, auth.uid(), invite, 4)
  RETURNING * INTO new_league;

  INSERT INTO public.game_sessions (league_id, mode, season, episode)
  VALUES (new_league.id, 'setup', start_season, 1);

  FOR i IN 1..4 LOOP
    INSERT INTO public.league_teams (league_id, name, position, user_id)
    VALUES (
      new_league.id,
      'Team ' || i,
      i,
      CASE WHEN i = 1 THEN auth.uid() ELSE NULL END
    );
  END LOOP;

  RETURN new_league;
END;
$function$;