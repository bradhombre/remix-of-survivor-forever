-- Allow NULL league_id for super_admin entries
ALTER TABLE public.league_memberships
ALTER COLUMN league_id DROP NOT NULL;