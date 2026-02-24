

## Fix: Contestants Auto-Assigned to Teams Before Draft

### Root Cause Analysis

Database evidence confirms the bug: multiple sessions have all contestants assigned owners with `pick_number = NULL` and `current_draft_index = 0`, meaning owners were set **outside** the normal draft flow.

**Two interconnected issues:**

1. **`getPicksPerTeam` auto-calculates dangerously high values.** When `picks_per_team` is not explicitly set (null), the formula `Math.floor(contestantCount / teamCount)` produces surprisingly large numbers. For example, 24 contestants with 2 teams yields 12 picks/team -- the user expected 4.

2. **Admin Panel allows unlimited manual owner assignment.** The `updateContestantOwner` function in `AdminPanel.tsx` lets admins assign any contestant to any team with no enforcement of the `picks_per_team` limit. This is likely how "14 players" ended up on one team without going through the draft.

### Plan

**File 1: `src/components/AdminPanel.tsx`** -- Enforce picks_per_team when manually assigning owners

- In `updateContestantOwner`, before updating, count how many contestants the target team already owns
- If it would exceed `picks_per_team`, show a toast error and block the assignment
- This prevents admins from accidentally over-assigning contestants to a team

**File 2: `src/components/SetupMode.tsx`** -- Default picks_per_team to 4 when unset

- When the setup UI renders and `picks_per_team` is null, default the display and suggestion to 4 (the expected default) rather than `floor(contestantCount / teamCount)`
- Add a clear callout showing the current picks_per_team value so users know what they're getting before starting the draft

**File 3: `src/lib/picksPerTeam.ts`** -- Cap auto-calculated picks at a sensible default

- Change the fallback from `Math.floor(contestantCount / teamCount)` to `Math.min(4, Math.floor(contestantCount / teamCount))` so that when picks_per_team is not explicitly set, it defaults to at most 4 instead of distributing all contestants
- This prevents the "surprise 12 picks per team" scenario

**File 4: `src/components/DraftMode.tsx`** -- Add per-team pick limit enforcement

- In the draft contestant handler, verify the current drafter hasn't already reached their `picksPerTeam` limit before allowing the pick
- Skip to the next eligible drafter if a team is full (edge case safety net)

### Summary

These changes add defense-in-depth: the core calculation is capped, the admin UI enforces limits, and the draft flow validates before each pick. The user's expected "limit of 4" behavior will become the default.

