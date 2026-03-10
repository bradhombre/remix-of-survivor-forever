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
    E'Hey! 👋 I''m JeffBot, your Survivor encyclopedia and app assistant. Tag me with @jeffbot followed by any question — trivia, strategy, history, or how to use the app!\n\nThis is also your league''s group chat — trash talk, strategize, and discuss episodes with your league mates!\n\nTry asking: "How do I score an episode?" or "Who has the most individual immunity wins?"',
    true
  );
  RETURN NEW;
END;
$function$;