
# Auto-Assign League Creator to Team 1

## Problem
When a user creates a new league, they are added as a `league_admin` in the `league_memberships` table, but they are **not** assigned to any team slot in `league_teams`. This leaves the creator without a team, which is confusing.

## Solution
Modify the `create_league` database function to automatically assign the league creator to Team 1 after creating the team slots.

## Change Summary

| Component | Change |
|-----------|--------|
| Database function: `create_league` | Add assignment of creator to Team 1 after creating team slots |

## Technical Details

**Current behavior:**
```sql
-- Creates team slots but doesn't assign anyone
FOR i IN 1..4 LOOP
  INSERT INTO public.league_teams (league_id, name, position)
  VALUES (new_league.id, 'Team ' || i, i);
END LOOP;
```

**Updated behavior:**
```sql
-- Create team slots
FOR i IN 1..4 LOOP
  INSERT INTO public.league_teams (league_id, name, position, user_id)
  VALUES (
    new_league.id, 
    'Team ' || i, 
    i, 
    CASE WHEN i = 1 THEN auth.uid() ELSE NULL END  -- Assign creator to Team 1
  );
END LOOP;
```

## Migration SQL

```sql
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
```

## Benefits
- League creators are immediately assigned to Team 1
- No extra step needed for the admin to claim a team
- Consistent with the expectation that the creator is a participant
