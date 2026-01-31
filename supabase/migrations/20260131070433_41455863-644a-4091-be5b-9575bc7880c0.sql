-- Create master_contestants table for storing official Survivor cast data
CREATE TABLE public.master_contestants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number integer NOT NULL,
  name text NOT NULL,
  image_url text,
  tribe text,
  age integer,
  occupation text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(season_number, name)
);

-- Enable RLS
ALTER TABLE public.master_contestants ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view master contestants
CREATE POLICY "Authenticated users can view master contestants"
ON public.master_contestants
FOR SELECT
TO authenticated
USING (true);

-- Only super admins can insert master contestants
CREATE POLICY "Super admins can insert master contestants"
ON public.master_contestants
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- Only super admins can update master contestants
CREATE POLICY "Super admins can update master contestants"
ON public.master_contestants
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Only super admins can delete master contestants
CREATE POLICY "Super admins can delete master contestants"
ON public.master_contestants
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));