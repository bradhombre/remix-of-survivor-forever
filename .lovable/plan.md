

# Configurable Picks Per Team

## Overview
Currently, picks per team is hardcoded: 4 for "full fantasy" and 1 for "winner takes all." This doesn't adapt when a league has fewer teams (e.g., 2 teams with 18 contestants could mean 9 picks each) or when the admin wants a custom number. We need to make this configurable.

## Approach

### 1. Add `picks_per_team` column to `game_sessions` table

Add a new nullable integer column `picks_per_team` with a default of `NULL`. When `NULL`, the app calculates a sensible default automatically; when set, it uses the admin's override.

```text
game_sessions
  + picks_per_team  INTEGER  DEFAULT NULL
```

### 2. Auto-calculate a smart default

When `picks_per_team` is not explicitly set, the app will compute it as:

```text
floor(contestant_count / team_count)
```

For example: 18 contestants / 4 teams = 4 picks each. 18 / 2 teams = 9 picks each. Winner-takes-all always defaults to 1.

### 3. Add a "Picks Per Team" setting in the Admin Setup tab

In `SetupMode.tsx`, add a new section (near the draft type selector) where the league admin can:
- See the auto-calculated suggestion (e.g., "Suggested: 4 based on 18 contestants / 4 teams")
- Override with a custom number using a number input or slider (range: 1 to `floor(contestants / teams)`)
- Reset back to auto

### 4. Update all hardcoded `picksPerTeam` references

Replace the hardcoded `gameType === "winner_takes_all" ? 1 : 4` pattern across these files:

| File | What changes |
|------|-------------|
| `src/hooks/useGameStateDB.ts` | Read `picks_per_team` from session; use it in `draftContestant()` logic |
| `src/pages/LeagueDashboard.tsx` | Use the stored/computed value instead of hardcoded 4/1 |
| `src/components/DraftMode.tsx` | Use the stored value for total picks calculation and per-team display |
| `src/components/GameMode.tsx` | Use stored value for leaderboard "active count" display |
| `src/components/SetupMode.tsx` | Update `canStartDraft` to use dynamic minimum (`picksPerTeam * teamCount`) instead of hardcoded 16; add the new admin UI |

### 5. Update the "Start Draft" validation

Instead of `contestants.length >= 16`, the check becomes:

```text
contestants.length >= (picksPerTeam * teamCount)
```

And the button text updates accordingly: "Start Draft (18/20 contestants added)" where 20 = 5 teams x 4 picks.

### 6. Flow through the state

The `useGameStateDB` hook already loads the game session. We add `picks_per_team` to the `GameState` type and load/save it alongside other session fields. A new `setPicksPerTeam` action saves it to the DB.

---

## Technical Details

**Database migration:**
```sql
ALTER TABLE game_sessions 
ADD COLUMN picks_per_team integer DEFAULT NULL;
```

**Types change (`src/types/survivor.ts`):**
Add `picksPerTeam?: number | null` to `GameState`.

**Files to modify:**
- `src/types/survivor.ts` -- add field to GameState
- `src/hooks/useGameStateDB.ts` -- load/save/expose `picksPerTeam`; update `draftContestant`; add `setPicksPerTeam` action
- `src/components/SetupMode.tsx` -- add UI control; update validation and button text
- `src/components/DraftMode.tsx` -- use dynamic value
- `src/components/GameMode.tsx` -- use dynamic value  
- `src/pages/LeagueDashboard.tsx` -- use dynamic value from state

**Computed default helper (shared):**
```typescript
function getPicksPerTeam(
  explicit: number | null, 
  gameType: string, 
  contestantCount: number, 
  teamCount: number
): number {
  if (gameType === "winner_takes_all") return 1;
  if (explicit) return explicit;
  return Math.max(1, Math.floor(contestantCount / teamCount));
}
```

