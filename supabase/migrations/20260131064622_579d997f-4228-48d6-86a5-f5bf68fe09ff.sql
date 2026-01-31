-- Add display_name column to profiles
ALTER TABLE public.profiles 
ADD COLUMN display_name text;

-- Add constraint for reasonable length
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_display_name_length 
CHECK (char_length(display_name) <= 50);