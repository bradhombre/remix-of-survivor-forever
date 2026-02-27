
# Fix: Remove Hard Cap on Picks Per Team

## Problem
You're limited to 4 picks per team because of two issues:

1. The auto-calculation formula has a hard cap: `Math.min(4, ...)` that prevents more than 4 picks regardless of your league setup.
2. The picks-per-team input on the Setup page has its maximum value tied to the same capped formula, so you physically can't type a number higher than 4.

## Solution

### 1. Remove the hard cap in `src/lib/picksPerTeam.ts`
Change the auto-calculation from `Math.min(4, ...)` to simply `Math.floor(contestantCount / teamCount)`. This way, with 24 contestants and 2 teams, the auto value will correctly be 12.

### 2. Fix the input max in `src/components/SetupMode.tsx`
Change the `max` attribute on the picks-per-team input from `Math.max(1, suggestedPicks)` to the actual contestant count (or a reasonable upper bound like `contestants.length`), so you can freely set any valid number.

Also update the `suggestedPicks` calculation on the same page to remove its own `Math.min(4, ...)` cap.

### 3. Update the Create League wizard in `src/components/CreateLeagueDialog.tsx`
The `defaultPicks` calculation on line 231 also uses `Math.floor(18 / leagueSize)` without capping at 4 -- this is fine, but for consistency it should use the shared `getPicksPerTeam` helper.

## Technical Details

**File: `src/lib/picksPerTeam.ts`** (line 10)
- Change: `Math.min(4, Math.max(1, Math.floor(contestantCount / teamCount)))` to `Math.max(1, Math.floor(contestantCount / teamCount))`

**File: `src/components/SetupMode.tsx`**
- Line 353: Remove `Math.min(4, ...)` from `suggestedPicks`
- Line 753: Change `max={Math.max(1, suggestedPicks)}` to `max={contestants.length || 20}`

These are small, targeted changes across 2 files.
