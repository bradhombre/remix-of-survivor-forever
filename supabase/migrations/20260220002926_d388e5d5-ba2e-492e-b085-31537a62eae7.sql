
-- Fix 1: Add a trigger to sanitize chat message content (strip HTML tags and control characters)
CREATE OR REPLACE FUNCTION public.sanitize_chat_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Strip HTML tags
  NEW.content := regexp_replace(NEW.content, '<[^>]*>', '', 'g');
  -- Strip control characters (keep newlines and tabs)
  NEW.content := regexp_replace(NEW.content, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', '', 'g');
  -- Trim whitespace
  NEW.content := trim(NEW.content);
  -- Reject empty content after sanitization
  IF NEW.content = '' THEN
    RAISE EXCEPTION 'Message content cannot be empty';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sanitize_chat_message_content
BEFORE INSERT OR UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.sanitize_chat_content();

-- Fix 2: Replace join_league with race-condition-safe version using FOR UPDATE
CREATE OR REPLACE FUNCTION public.join_league(invite_code_input text)
 RETURNS league_memberships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  target_league public.leagues;
  new_membership public.league_memberships;
  available_team public.league_teams;
  recent_joins integer;
BEGIN
  -- Rate limit: max 5 league joins per hour per user
  SELECT COUNT(*) INTO recent_joins
  FROM public.league_memberships
  WHERE user_id = auth.uid()
    AND joined_at > now() - interval '1 hour';

  IF recent_joins >= 5 THEN
    RAISE EXCEPTION 'Too many join attempts. Please try again later.';
  END IF;

  -- Find league by invite code
  SELECT * INTO target_league
  FROM public.leagues
  WHERE invite_code = UPPER(invite_code_input);

  IF target_league IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.league_memberships 
    WHERE league_id = target_league.id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already a member of this league';
  END IF;

  -- Find next available team slot WITH ROW LOCK to prevent race conditions
  SELECT * INTO available_team
  FROM public.league_teams
  WHERE league_id = target_league.id AND user_id IS NULL
  ORDER BY position
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF available_team IS NULL THEN
    RAISE EXCEPTION 'League is full - no available slots';
  END IF;

  -- Insert as player
  INSERT INTO public.league_memberships (league_id, user_id, role)
  VALUES (target_league.id, auth.uid(), 'player')
  RETURNING * INTO new_membership;

  -- Auto-assign to team slot
  UPDATE public.league_teams
  SET user_id = auth.uid()
  WHERE id = available_team.id;

  RETURN new_membership;
END;
$$;
