-- Phase 9: Add status column to game_sessions
ALTER TABLE public.game_sessions 
ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Phase 9: Add auto_renew column to leagues
ALTER TABLE public.leagues 
ADD COLUMN auto_renew boolean NOT NULL DEFAULT true;

-- Phase 10: Create news_posts table
CREATE TABLE public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_spoiler boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL
);

-- Enable RLS on news_posts
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read non-spoiler, non-expired posts
CREATE POLICY "Users can read non-spoiler active posts"
ON public.news_posts
FOR SELECT
TO authenticated
USING (
  is_spoiler = false 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Policy: Super admins can read all posts (including spoilers and expired)
CREATE POLICY "Super admins can read all posts"
ON public.news_posts
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Policy: Super admins can insert posts
CREATE POLICY "Super admins can create posts"
ON public.news_posts
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- Policy: Super admins can update posts
CREATE POLICY "Super admins can update posts"
ON public.news_posts
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Policy: Super admins can delete posts
CREATE POLICY "Super admins can delete posts"
ON public.news_posts
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));