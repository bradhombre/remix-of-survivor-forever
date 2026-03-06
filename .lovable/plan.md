

## Bug: "Gord" Not Showing -- Data Mismatch

### Root Cause

In the "League of Champs" league, the user `buddyholley1958@gmail.com` (team "Gord") has 4 contestants assigned to the old name **"Team 2"** instead of **"Gord"**. This happened because the team was renamed after draft picks were already made, and the rename didn't propagate to the `contestants` table.

The draft order was updated correctly ("Gord" appears at position 4), but the contestant ownership still says "Team 2". Since no team named "Team 2" exists anymore, those picks appear orphaned -- visible only to Gord's own screen (where code might fall back to showing them) but invisible to everyone else's leaderboard/scoring views.

**Affected contestants (owner = "Team 2"):**
- Colby Donaldson
- Joe Hunter
- Quintavius "Q" Burdette
- Savannah Louie

### Fix

#### 1. Data repair (SQL migration)
Update the 4 orphaned contestant records in this session to use the correct team name "Gord":

```sql
UPDATE contestants
SET owner = 'Gord'
WHERE session_id = '6c80c89f-0c0a-4b05-89ad-9ff6e511644c'
  AND owner = 'Team 2';
```

#### 2. No code changes needed
The `rename_team_everywhere` function already handles this correctly going forward -- it updates `contestants.owner` and `draft_order.player_name`. The issue was that the rename likely happened through a direct team name update (bypassing the RPC function) before the atomic rename was implemented.

