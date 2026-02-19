

# Setup Wizard + WTA Picks + Scoring Tab Treatment

## 1. Allow configurable picks per team for Winner Takes All

Update `src/lib/picksPerTeam.ts` to respect explicit overrides for WTA instead of always returning 1:
```
if (gameType === "winner_takes_all") return explicit || 1;
```

Update `src/components/SetupMode.tsx` to pass the actual game type (not hardcoded "full") to `getPicksPerTeam`, and show the picks-per-team control for both game types. For WTA, add a note like "Each player picks N Sole Survivor prediction(s)."

Update `src/components/WinnerTakesAllMode.tsx` to handle multiple picks per player -- use `filter` instead of `find` when grouping contestants by owner, and display all of a player's picks in each card.

Update `src/components/DraftMode.tsx` title to say "Pick Your Sole Survivor Predictions" (plural) when WTA picks > 1.

## 2. Expand CreateLeagueDialog into a 4-step setup wizard

Expand `src/components/CreateLeagueDialog.tsx` from 2 steps to 4:

| Step | Title | Content |
|------|-------|---------|
| 1 | Name + Game Type | Same as current |
| 2 | League Settings | League size (2-20, +/- buttons), picks per team (with auto-suggestion), season number. Saves via `resize_league` RPC, updates `game_sessions.picks_per_team` and `game_sessions.season` |
| 3 | Import Cast | "Import Season N Cast" button (fetches from `master_contestants`), or "Skip" to add manually later |
| 4 | Customize Team | Same as current step 2 (team name + avatar) |

Each step includes a note: "You can always change these later in Settings."

Visual additions:
- Step indicator dots at top of dialog
- "Back" button on steps 2-4
- The league is created after step 1 (same as today); steps 2-4 modify the already-created league

Props needed: `gameType` is already tracked in state. New state variables: `leagueSize` (default 4), `picksPerTeamOverride` (null = auto), `seasonNumber` (default 50), `importingCast` (boolean), `sessionId` (fetched after creation).

For WTA leagues, the picks-per-team control in step 2 defaults to 1 but can be increased.

## 3. Gray out Scoring tab for Winner Takes All leagues

Update `src/components/AdminPanel.tsx`:
- Add `gameType` prop
- When `gameType === 'winner_takes_all'`, wrap `ScoringSettings` in a relative container with `opacity-40 pointer-events-none`, and overlay a message: "Custom scoring doesn't apply to Winner Takes All leagues. Switch to Full Fantasy to customize scoring."

Update `src/pages/LeagueDashboard.tsx`:
- Pass `gameType={state.gameType}` to `AdminPanel`

## Technical Details

**No database changes needed** -- all required columns (`picks_per_team`, `season`, `game_type`) and RPCs (`resize_league`) already exist.

**Files to modify:**
- `src/lib/picksPerTeam.ts` -- Allow WTA overrides
- `src/components/CreateLeagueDialog.tsx` -- Major rewrite: 4-step wizard
- `src/components/AdminPanel.tsx` -- Add `gameType` prop, gray out scoring for WTA
- `src/components/SetupMode.tsx` -- Pass actual game type, show picks control for both types
- `src/components/WinnerTakesAllMode.tsx` -- Handle multiple picks per player
- `src/components/DraftMode.tsx` -- Plural title for WTA with multiple picks
- `src/pages/LeagueDashboard.tsx` -- Pass `gameType` to AdminPanel, pass `gameType` to SetupMode

**SetupMode needs `gameType` prop** -- currently it doesn't receive the game type. Add it to `SetupModeProps` and pass it from `AdminPanel` (which gets it from `LeagueDashboard`).
