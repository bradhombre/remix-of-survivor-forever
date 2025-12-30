-- Create scoring_templates table for user-saved templates
CREATE TABLE public.scoring_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  emoji text NOT NULL DEFAULT '⭐',
  config jsonb NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scoring_templates ENABLE ROW LEVEL SECURITY;

-- League members can view templates
CREATE POLICY "League members can view templates"
ON public.scoring_templates
FOR SELECT
USING (is_league_member(auth.uid(), league_id));

-- League admins can create templates
CREATE POLICY "League admins can create templates"
ON public.scoring_templates
FOR INSERT
WITH CHECK (
  has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR is_super_admin(auth.uid())
);

-- League admins can delete templates
CREATE POLICY "League admins can delete templates"
ON public.scoring_templates
FOR DELETE
USING (
  has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR is_super_admin(auth.uid())
);

-- League admins can update templates
CREATE POLICY "League admins can update templates"
ON public.scoring_templates
FOR UPDATE
USING (
  has_league_role(auth.uid(), league_id, ARRAY['league_admin', 'super_admin'])
  OR is_super_admin(auth.uid())
);