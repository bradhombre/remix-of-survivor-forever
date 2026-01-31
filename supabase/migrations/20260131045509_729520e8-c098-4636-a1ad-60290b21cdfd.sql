CREATE OR REPLACE FUNCTION public.create_league(league_name text)
 RETURNS leagues
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_league public.leagues;
  invite TEXT;
  i INTEGER;
BEGIN
  -- Generate unique invite code
  LOOP
    invite := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.leagues WHERE invite_code = invite);
  END LOOP;

  -- Insert the league (trigger will auto-add owner as league_admin)
  INSERT INTO public.leagues (name, owner_id, invite_code, team_count)
  VALUES (league_name, auth.uid(), invite, 4)
  RETURNING * INTO new_league;

  -- Create a game session in setup mode for the league
  INSERT INTO public.game_sessions (league_id, mode, season, episode)
  VALUES (new_league.id, 'setup', 49, 1);

  -- Create default teams, assigning creator to Team 1
  FOR i IN 1..4 LOOP
    INSERT INTO public.league_teams (league_id, name, position, user_id)
    VALUES (
      new_league.id, 
      'Team ' || i, 
      i,
      CASE WHEN i = 1 THEN auth.uid() ELSE NULL END
    );
  END LOOP;

  RETURN new_league;
END;
$function$;