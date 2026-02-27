

# Data Repair: Fix Mismatched Contestant Owners

## Overview
Execute the data repair that was planned earlier but never run. This will fix the "0/4 active players" issue across all affected leagues by updating `contestants.owner` to match the current team names.

## Step 1: Fix leagues WITH draft_order (snake draft math)

For leagues that completed their draft and then renamed teams, use snake draft logic to compute the correct owner from each contestant's `pick_number`:

```sql
UPDATE contestants c
SET owner = d.player_name
FROM (
  SELECT c2.id AS contestant_id,
         d2.player_name,
         c2.session_id
  FROM contestants c2
  JOIN game_sessions gs ON c2.session_id = gs.id
  JOIN draft_order d2 ON d2.session_id = c2.session_id
  WHERE c2.owner IS NOT NULL
    AND c2.pick_number IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM draft_order dx
      WHERE dx.session_id = c2.session_id AND dx.player_name = c2.owner
    )
    AND d2.position = (
      CASE
        WHEN ((c2.pick_number - 1) / (SELECT COUNT(*) FROM draft_order dd WHERE dd.session_id = c2.session_id))::int % 2 = 0
        THEN (c2.pick_number - 1) % (SELECT COUNT(*) FROM draft_order dd WHERE dd.session_id = c2.session_id) + 1
        ELSE (SELECT COUNT(*) FROM draft_order dd WHERE dd.session_id = c2.session_id) - (c2.pick_number - 1) % (SELECT COUNT(*) FROM draft_order dd WHERE dd.session_id = c2.session_id)
      END
    )
) d
WHERE c.id = d.contestant_id;
```

## Step 2: Fix leagues WITHOUT draft_order (position-based mapping)

For leagues still in setup mode where teams were renamed from "Team N" to custom names:

```sql
UPDATE contestants c
SET owner = lt.name
FROM game_sessions gs, league_teams lt
WHERE c.session_id = gs.id
  AND lt.league_id = gs.league_id
  AND c.owner ~ '^Team [0-9]+$'
  AND lt.position = CAST(substring(c.owner FROM 'Team ([0-9]+)') AS integer)
  AND NOT EXISTS (
    SELECT 1 FROM draft_order d
    WHERE d.session_id = c.session_id AND d.player_name = c.owner
  )
  AND NOT EXISTS (
    SELECT 1 FROM league_teams lt2
    WHERE lt2.league_id = gs.league_id AND lt2.name = c.owner
  );
```

## No code changes needed
The frontend will automatically reflect the corrected data on next page load.

