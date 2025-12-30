
-- Create league_teams table for dynamic team management per league
CREATE TABLE public.league_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(league_id, name),
  UNIQUE(league_id, position)
);

-- Enable RLS
ALTER TABLE public.league_teams ENABLE ROW LEVEL SECURITY;

-- RLS policies for league_teams
CREATE POLICY "League members can view teams"
  ON public.league_teams FOR SELECT
  USING (is_league_member(auth.uid(), league_id));

CREATE POLICY "League admins can insert teams"
  ON public.league_teams FOR INSERT
  WITH CHECK (has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin']) OR is_super_admin(auth.uid()));

CREATE POLICY "League admins can update teams"
  ON public.league_teams FOR UPDATE
  USING (has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin']) OR is_super_admin(auth.uid()));

CREATE POLICY "League admins can delete teams"
  ON public.league_teams FOR DELETE
  USING (has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin']) OR is_super_admin(auth.uid()));

-- Users can claim unclaimed teams in their league
CREATE POLICY "Users can claim unclaimed teams"
  ON public.league_teams FOR UPDATE
  USING (is_league_member(auth.uid(), league_id) AND user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Add team_count to leagues table
ALTER TABLE public.leagues ADD COLUMN team_count INTEGER DEFAULT 4;

-- Add league_id to archived_seasons table
ALTER TABLE public.archived_seasons ADD COLUMN league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE;

-- Update create_league function to auto-create default teams
CREATE OR REPLACE FUNCTION public.create_league(league_name text)
RETURNS leagues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_league public.leagues;
  invite TEXT;
  i INTEGER;
BEGIN
  -- Generate unique invite code
  LOOP
    invite := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.leagues WHERE invite_code = invite);
  END LOOP;

  -- Insert the league (trigger will auto-add owner as league_admin)
  INSERT INTO public.leagues (name, owner_id, invite_code, team_count)
  VALUES (league_name, auth.uid(), invite, 4)
  RETURNING * INTO new_league;

  -- Create a game session in setup mode for the league
  INSERT INTO public.game_sessions (league_id, mode, season, episode)
  VALUES (new_league.id, 'setup', 49, 1);

  -- Create default teams
  FOR i IN 1..4 LOOP
    INSERT INTO public.league_teams (league_id, name, position)
    VALUES (new_league.id, 'Team ' || i, i);
  END LOOP;

  RETURN new_league;
END;
$$;

-- Create claim_team function
CREATE OR REPLACE FUNCTION public.claim_team(team_id uuid)
RETURNS league_teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_team public.league_teams;
BEGIN
  -- Get the team
  SELECT * INTO target_team FROM public.league_teams WHERE id = team_id;
  
  IF target_team IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Check if user is a member of the league
  IF NOT is_league_member(auth.uid(), target_team.league_id) THEN
    RAISE EXCEPTION 'Not a member of this league';
  END IF;

  -- Check if team is already claimed
  IF target_team.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Team already claimed';
  END IF;

  -- Check if user already has a team in this league
  IF EXISTS (SELECT 1 FROM public.league_teams WHERE league_id = target_team.league_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You already have a team in this league';
  END IF;

  -- Claim the team
  UPDATE public.league_teams 
  SET user_id = auth.uid() 
  WHERE id = team_id
  RETURNING * INTO target_team;

  RETURN target_team;
END;
$$;

-- Create function to get available teams for a league
CREATE OR REPLACE FUNCTION public.get_available_teams(league_uuid uuid)
RETURNS SETOF league_teams
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.league_teams 
  WHERE league_id = league_uuid AND user_id IS NULL
  ORDER BY position;
$$;

-- Populate league_teams for existing leagues
INSERT INTO public.league_teams (league_id, name, position)
SELECT l.id, 'Team ' || n, n
FROM public.leagues l
CROSS JOIN generate_series(1, COALESCE(l.team_count, 4)) AS n
WHERE NOT EXISTS (
  SELECT 1 FROM public.league_teams lt WHERE lt.league_id = l.id
);
