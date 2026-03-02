
-- Add last_activity_at and is_inactive_notified columns
ALTER TABLE public.leagues 
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_inactive_notified boolean NOT NULL DEFAULT false;

-- Backfill last_activity_at from most recent activity
UPDATE public.leagues l
SET last_activity_at = COALESCE(
  (SELECT GREATEST(
    COALESCE((SELECT MAX(cm.created_at) FROM public.chat_messages cm WHERE cm.league_id = l.id), l.created_at),
    COALESCE((SELECT MAX(se.created_at) FROM public.scoring_events se WHERE se.session_id IN (SELECT gs.id FROM public.game_sessions gs WHERE gs.league_id = l.id)), l.created_at),
    COALESCE((SELECT MAX(gs.updated_at) FROM public.game_sessions gs WHERE gs.league_id = l.id), l.created_at)
  )),
  l.created_at
);

-- Create trigger function
CREATE OR REPLACE FUNCTION public.update_league_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _league_id uuid;
BEGIN
  -- Determine the league_id based on which table fired the trigger
  IF TG_TABLE_NAME = 'chat_messages' THEN
    _league_id := NEW.league_id;
  ELSIF TG_TABLE_NAME = 'scoring_events' THEN
    SELECT league_id INTO _league_id FROM public.game_sessions WHERE id = NEW.session_id;
  ELSIF TG_TABLE_NAME = 'game_sessions' THEN
    _league_id := NEW.league_id;
  END IF;

  IF _league_id IS NOT NULL THEN
    UPDATE public.leagues SET last_activity_at = now() WHERE id = _league_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Attach triggers
CREATE TRIGGER trg_chat_activity
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_league_activity();

CREATE TRIGGER trg_scoring_activity
  AFTER INSERT ON public.scoring_events
  FOR EACH ROW EXECUTE FUNCTION public.update_league_activity();

CREATE TRIGGER trg_session_activity
  AFTER UPDATE OF mode, episode ON public.game_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_league_activity();
