

# Import Season 49 Data & Rename Teams

## What We'll Do

1. **Rename the 4 teams** in the "Survivor Squad" league from generic names to the original player names:
   - Team 1 -> Brad
   - Team 2 -> Coco
   - Team 3 -> Kalin
   - Team 4 -> Roy

2. **Update the draft order** for the current Season 50 session to use the new team names (currently references "Team 1" etc.)

3. **Update contestant owners** in the current Season 50 session -- the 24 contestants currently have owners referencing "Team 1/2/3/4", these need to match "Brad/Coco/Kalin/Roy"

4. **Insert Season 49 archived data** into the `archived_seasons` table using the uploaded JSON file, linked to the Survivor Squad league

5. **Reset the Season 50 session to setup mode** since you mentioned the season hasn't kicked off yet (it's currently set to "game" mode)

## Data Summary from Uploaded File

- **Season 49** with 17 contestants across tribes Kele, Hina, and Uli
- **Final Standings**: Brad (610pts, 1st), Roy (555pts, 2nd), Coco (520pts, 3rd), Kalin (300pts, 4th)
- **Scoring Events**: Multiple episodes of scoring data (points, actions, episodes)
- All data will be stored in the `archived_seasons` table as JSONB

## Technical Details

### Database Operations (no schema changes needed)

All changes are data updates using the existing tables:

**1. Rename teams** (`league_teams` table):
```sql
UPDATE league_teams SET name = 'Brad' WHERE id = '6efca731-...' -- position 1
UPDATE league_teams SET name = 'Coco' WHERE id = '374066ca-...' -- position 2
UPDATE league_teams SET name = 'Kalin' WHERE id = 'f566e612-...' -- position 3
UPDATE league_teams SET name = 'Roy' WHERE id = 'bb7e4914-...' -- position 4
```

**2. Update draft_order** player names for session `6ee8522f-...`

**3. Update contestant owners** in session `6ee8522f-...` (map Team 1->Brad, etc.)

**4. Insert archived season** into `archived_seasons` with the full JSON (contestants, scoringEvents, finalStandings)

**5. Reset game session** mode back to `setup`, season to 50, episode to 1

### No Code Changes Required

The existing `HistoryMode` component already reads from `archived_seasons` and displays the data. The team rename will propagate through the existing `useLeagueTeams` hook.

