# Fix: Teams Showing 0/4 Active Players and No Points

## Problem

When a team is renamed (via the League settings), the system updates the team name in `league_teams` and `draft_order`, but **does not update the `owner` column on the `contestants` table**. Since the leaderboard and active player count both work by matching `contestant.owner === draftOrder[i]`, any renamed team will show 0 active players and 0 points -- the contestants are still tagged with the old team name.

## Solution

Update the team rename logic to also sync the `contestants.owner` column, and add a database-level function to do this atomically. Please make sure you preserve the data

### 1. Database migration: Create `rename_team` function

A single SQL function that atomically renames a team across all three tables (`league_teams`, `draft_order`, `contestants`) within the same session:

```sql
CREATE OR REPLACE FUNCTION rename_team_everywhere(
  _league_id uuid,
  _team_id uuid,
  _old_name text,
  _new_name text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _session_id uuid;
BEGIN
  -- Update the team name
  UPDATE league_teams SET name = _new_name WHERE id = _team_id;

  -- Find the active game session for this league
  SELECT id INTO _session_id
  FROM game_sessions
  WHERE league_id = _league_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF _session_id IS NOT NULL THEN
    -- Update draft order
    UPDATE draft_order
    SET player_name = _new_name
    WHERE session_id = _session_id AND player_name = _old_name;

    -- Update contestant owners
    UPDATE contestants
    SET owner = _new_name
    WHERE session_id = _session_id AND owner = _old_name;
  END IF;
END;
$$;
```

### 2. Code fix: Update `renameTeam` and `updateTeam` in `useLeagueTeams.ts`

Replace the manual multi-step updates with a single RPC call to `rename_team_everywhere`. This ensures all three tables stay in sync atomically.

### 3. One-time data repair migration

Also include a migration to fix any existing mismatched data -- find contestants whose `owner` doesn't match any current `draft_order.player_name` for the same session, and update them based on the `league_teams` history. This will retroactively fix leagues that already have this issue.

```sql
-- Fix existing mismatches: update contestants whose owner
-- matches an old team name that was renamed
UPDATE contestants c
SET owner = d.player_name
FROM draft_order d
WHERE c.session_id = d.session_id
  AND c.pick_number = d.position + 1  -- rough match by pick order
  AND c.owner IS NOT NULL
  AND c.owner != d.player_name
  AND NOT EXISTS (
    SELECT 1 FROM draft_order d2
    WHERE d2.session_id = c.session_id
      AND d2.player_name = c.owner
  );
```

However, since pick_number doesn't reliably map to position, a safer approach is to just ensure the rename function is used going forward and let admins manually fix any existing mismatches via the Admin panel's contestant reassignment UI.

### Summary of changes


| File                          | Change                                                              |
| ----------------------------- | ------------------------------------------------------------------- |
| New migration                 | `rename_team_everywhere` SQL function                               |
| `src/hooks/useLeagueTeams.ts` | Call RPC instead of manual updates in `renameTeam` and `updateTeam` |
