-- Create helper function to check if user is member of session's league
CREATE OR REPLACE FUNCTION public.is_session_league_member(_user_id uuid, _session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_sessions gs
    JOIN public.league_memberships lm ON lm.league_id = gs.league_id
    WHERE gs.id = _session_id AND lm.user_id = _user_id
  ) OR public.is_super_admin(_user_id)
$$;

-- Update game_sessions RLS to allow league members to update
DROP POLICY IF EXISTS "League admins can update game sessions" ON public.game_sessions;

CREATE POLICY "League members can update game sessions"
ON public.game_sessions FOR UPDATE
USING (is_league_member(auth.uid(), league_id) OR is_super_admin(auth.uid()));

-- Update contestants RLS
DROP POLICY IF EXISTS "Authenticated users can manage contestants" ON public.contestants;
DROP POLICY IF EXISTS "Authenticated users can view contestants" ON public.contestants;

CREATE POLICY "League members can view contestants"
ON public.contestants FOR SELECT
USING (is_session_league_member(auth.uid(), session_id));

CREATE POLICY "League members can manage contestants"
ON public.contestants FOR ALL
USING (is_session_league_member(auth.uid(), session_id));

-- Update scoring_events RLS
DROP POLICY IF EXISTS "Authenticated users can manage scoring events" ON public.scoring_events;
DROP POLICY IF EXISTS "Authenticated users can view scoring events" ON public.scoring_events;

CREATE POLICY "League members can view scoring events"
ON public.scoring_events FOR SELECT
USING (is_session_league_member(auth.uid(), session_id));

CREATE POLICY "League members can manage scoring events"
ON public.scoring_events FOR ALL
USING (is_session_league_member(auth.uid(), session_id));

-- Update draft_order RLS
DROP POLICY IF EXISTS "Authenticated users can manage draft order" ON public.draft_order;
DROP POLICY IF EXISTS "Authenticated users can view draft order" ON public.draft_order;

CREATE POLICY "League members can view draft order"
ON public.draft_order FOR SELECT
USING (is_session_league_member(auth.uid(), session_id));

CREATE POLICY "League members can manage draft order"
ON public.draft_order FOR ALL
USING (is_session_league_member(auth.uid(), session_id));

-- Update crying_contestants RLS
DROP POLICY IF EXISTS "Authenticated users can manage crying contestants" ON public.crying_contestants;
DROP POLICY IF EXISTS "Authenticated users can view crying contestants" ON public.crying_contestants;

CREATE POLICY "League members can view crying contestants"
ON public.crying_contestants FOR SELECT
USING (is_session_league_member(auth.uid(), session_id));

CREATE POLICY "League members can manage crying contestants"
ON public.crying_contestants FOR ALL
USING (is_session_league_member(auth.uid(), session_id));

-- Update player_profiles RLS
DROP POLICY IF EXISTS "Authenticated users can manage player profiles" ON public.player_profiles;
DROP POLICY IF EXISTS "Authenticated users can view player profiles" ON public.player_profiles;

CREATE POLICY "League members can view player profiles"
ON public.player_profiles FOR SELECT
USING (is_session_league_member(auth.uid(), session_id));

CREATE POLICY "League members can manage player profiles"
ON public.player_profiles FOR ALL
USING (is_session_league_member(auth.uid(), session_id));

-- Update final_predictions RLS
DROP POLICY IF EXISTS "Authenticated users can create predictions" ON public.final_predictions;
DROP POLICY IF EXISTS "Authenticated users can delete predictions" ON public.final_predictions;
DROP POLICY IF EXISTS "Authenticated users can update predictions" ON public.final_predictions;
DROP POLICY IF EXISTS "Authenticated users can view predictions" ON public.final_predictions;

CREATE POLICY "League members can view predictions"
ON public.final_predictions FOR SELECT
USING (is_session_league_member(auth.uid(), session_id));

CREATE POLICY "League members can manage predictions"
ON public.final_predictions FOR ALL
USING (is_session_league_member(auth.uid(), session_id));