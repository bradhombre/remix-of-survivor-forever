
CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  page_url text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own bug reports"
  ON public.bug_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bug reports"
  ON public.bug_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all bug reports"
  ON public.bug_reports FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update bug reports"
  ON public.bug_reports FOR UPDATE
  USING (is_super_admin(auth.uid()));
