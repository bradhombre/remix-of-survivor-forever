
-- Create leagues table
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scoring_config JSONB,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create league_memberships table
CREATE TABLE public.league_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'league_admin', 'player')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (league_id, user_id)
);

-- Enable RLS
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;

-- Helper function to check league membership roles (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_league_role(_user_id UUID, _league_id UUID, _roles TEXT[])
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
      AND league_id = _league_id
      AND role = ANY(_roles)
  )
$$;

-- Helper function to check if user is super_admin (cross-league privileges)
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
  )
$$;

-- Helper function to check if user is member of a league
CREATE OR REPLACE FUNCTION public.is_league_member(_user_id UUID, _league_id UUID)
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
      AND league_id = _league_id
  )
$$;

-- Trigger function to auto-add league creator as league_admin
CREATE OR REPLACE FUNCTION public.handle_new_league()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.league_memberships (league_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'league_admin');
  RETURN NEW;
END;
$$;

-- Create trigger for auto-membership
CREATE TRIGGER on_league_created
  AFTER INSERT ON public.leagues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_league();

-- RLS Policies for leagues table

-- SELECT: Users can view leagues they're members of, super_admins can see all
CREATE POLICY "Users can view their leagues"
ON public.leagues
FOR SELECT
USING (
  public.is_league_member(auth.uid(), id)
  OR public.is_super_admin(auth.uid())
);

-- INSERT: Any authenticated user can create a league
CREATE POLICY "Authenticated users can create leagues"
ON public.leagues
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_id);

-- UPDATE: Only league owner can update their league
CREATE POLICY "League owners can update their league"
ON public.leagues
FOR UPDATE
USING (auth.uid() = owner_id);

-- DELETE: Only league owner can delete their league
CREATE POLICY "League owners can delete their league"
ON public.leagues
FOR DELETE
USING (auth.uid() = owner_id);

-- RLS Policies for league_memberships table

-- SELECT: Users can view their own memberships, admins can view all in their leagues, super_admins can see all
CREATE POLICY "Users can view memberships"
ON public.league_memberships
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR public.is_super_admin(auth.uid())
);

-- INSERT: League admins can add members
CREATE POLICY "League admins can add members"
ON public.league_memberships
FOR INSERT
WITH CHECK (
  public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR public.is_super_admin(auth.uid())
);

-- UPDATE: League admins can update member roles
CREATE POLICY "League admins can update member roles"
ON public.league_memberships
FOR UPDATE
USING (
  public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR public.is_super_admin(auth.uid())
);

-- DELETE: League admins can remove members (but not themselves)
CREATE POLICY "League admins can remove members"
ON public.league_memberships
FOR DELETE
USING (
  (public.has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
   OR public.is_super_admin(auth.uid()))
  AND auth.uid() != user_id
);
