
-- Auto-seed a JeffBot welcome message when a new league is created
CREATE OR REPLACE FUNCTION public.seed_jeffbot_welcome()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.chat_messages (league_id, user_id, content, is_bot)
  VALUES (
    NEW.id,
    NEW.owner_id,
    E'Hey! 👋 I''m JeffBot, your Survivor encyclopedia. Tag me with @jeffbot followed by any question — trivia, strategy, history, you name it.\n\nTry asking: "Who has the most individual immunity wins?"',
    true
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER seed_jeffbot_on_league_create
  AFTER INSERT ON public.leagues
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_jeffbot_welcome();
