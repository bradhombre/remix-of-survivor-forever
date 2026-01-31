-- Allow league members to see profiles of other league members
CREATE POLICY "League members can view co-member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.league_memberships lm1
    JOIN public.league_memberships lm2 ON lm1.league_id = lm2.league_id
    WHERE lm1.user_id = auth.uid()
    AND lm2.user_id = profiles.id
  )
);