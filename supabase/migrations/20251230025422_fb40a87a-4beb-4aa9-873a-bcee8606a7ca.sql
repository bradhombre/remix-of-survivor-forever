
-- Add league_id column to game_sessions (nullable initially for existing data)
ALTER TABLE public.game_sessions 
ADD COLUMN league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE;

-- Drop existing RLS policies on game_sessions
DROP POLICY IF EXISTS "Admins can create game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Admins can update game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Authenticated users can view game sessions" ON public.game_sessions;

-- New RLS policies based on league membership

-- SELECT: Users can view sessions for leagues they're members of, or super_admins can see all
CREATE POLICY "Users can view league game sessions"
ON public.game_sessions
FOR SELECT
USING (
  public.is_league_member(auth.uid(), league_id)
  OR public.is_super_admin(auth.uid())
);

-- INSERT: League admins can create sessions for their leagues
CREATE POLICY "League admins can create game sessions"
ON public.game_sessions
FOR INSERT
WITH CHECK (
  league_id IS NOT NULL
  AND (
    public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
    OR public.is_super_admin(auth.uid())
  )
);

-- UPDATE: League admins can update sessions for their leagues
CREATE POLICY "League admins can update game sessions"
ON public.game_sessions
FOR UPDATE
USING (
  public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR public.is_super_admin(auth.uid())
);

-- DELETE: League admins can delete sessions for their leagues
CREATE POLICY "League admins can delete game sessions"
ON public.game_sessions
FOR DELETE
USING (
  public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR public.is_super_admin(auth.uid())
);
