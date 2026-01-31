-- Add columns for RSS news sources
ALTER TABLE public.news_posts 
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS source_url text;

-- Add unique constraint on external_id (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS news_posts_external_id_unique 
ON public.news_posts (external_id) 
WHERE external_id IS NOT NULL;

-- Add index for faster source filtering
CREATE INDEX IF NOT EXISTS news_posts_source_idx ON public.news_posts (source);