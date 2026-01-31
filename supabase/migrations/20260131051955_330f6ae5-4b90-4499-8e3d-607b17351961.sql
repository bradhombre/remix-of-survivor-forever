-- Add avatar_url column to league_teams
ALTER TABLE public.league_teams
ADD COLUMN avatar_url text;

-- Create storage bucket for team avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-avatars', 'team-avatars', true);

-- Storage policy: Anyone can view team avatars (public bucket)
CREATE POLICY "Anyone can view team avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-avatars');

-- Storage policy: Users can upload their own team avatar
CREATE POLICY "Users can upload team avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-avatars' 
  AND auth.uid() IS NOT NULL
);

-- Storage policy: Users can update their own team avatar
CREATE POLICY "Users can update team avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team-avatars' AND auth.uid() IS NOT NULL);

-- Storage policy: Users can delete their own team avatar
CREATE POLICY "Users can delete team avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-avatars' AND auth.uid() IS NOT NULL);

-- RLS policy: Users can update their own team (name and avatar)
CREATE POLICY "Users can update own team"
ON public.league_teams FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);