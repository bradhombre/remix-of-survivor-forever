
-- Create app_settings key/value table
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Everyone can read settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage app settings"
  ON public.app_settings FOR ALL
  USING (is_super_admin(auth.uid()));

-- Seed with empty donate_url
INSERT INTO public.app_settings (key, value) VALUES ('donate_url', '');
