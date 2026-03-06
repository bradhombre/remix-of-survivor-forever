
ALTER TABLE public.bug_reports
  ADD COLUMN admin_notes text,
  ADD COLUMN user_viewed_response boolean NOT NULL DEFAULT false,
  ADD COLUMN league_id uuid REFERENCES public.leagues(id) ON DELETE SET NULL;
