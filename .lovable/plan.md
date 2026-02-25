

# Commissioner Manual Team Assignment + Draft Fix

## Problem
The draft process has been unreliable -- picks disappear when multiple users draft simultaneously because realtime updates trigger a full `loadGameState()` that can overwrite in-flight changes. The commissioner wants to simply assign contestants to teams directly and move on to using the rest of the app.

## Solution: Two Changes

### 1. Add a "Manual Assignment" mode to the Draft screen
Give the commissioner a prominent button to switch from the interactive draft to a manual assignment view, where they can drag-and-drop or use dropdowns to assign every contestant to a team in one go, then finalize.

- Add a "Commissioner: Assign Teams Manually" button visible to league admins on the Draft screen
- When clicked, show a streamlined UI with all contestants listed, each with a team dropdown
- Include a "Complete & Start Game" button that sets all assignments, updates `current_draft_index` to the total picks count, and transitions to game mode
- This bypasses the draft entirely, which is exactly what the user asked for

### 2. Fix the draft race condition at the database level
The current draft uses two parallel writes (`contestants.update` + `game_sessions.update`) without atomicity. Another user's realtime-triggered `loadGameState()` can read stale state between these writes, causing picks to appear deleted.

- Wrap the draft pick logic in a database function (`execute_draft_pick`) that performs the contestant update and draft index increment in a single transaction
- Add an optimistic locking check: the function accepts the expected `current_draft_index` and only proceeds if it matches the DB value, preventing double-picks

---

## Technical Details

### New Database Function: `execute_draft_pick`
```sql
CREATE OR REPLACE FUNCTION public.execute_draft_pick(
  _session_id uuid,
  _contestant_id uuid,
  _owner text,
  _pick_number integer,
  _expected_index integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_index integer;
BEGIN
  -- Lock the session row to prevent concurrent picks
  SELECT current_draft_index INTO current_index
  FROM game_sessions WHERE id = _session_id FOR UPDATE;

  -- Optimistic lock: only proceed if index matches expectation
  IF current_index != _expected_index THEN
    RETURN false;
  END IF;

  -- Assign contestant
  UPDATE contestants SET owner = _owner, pick_number = _pick_number
  WHERE id = _contestant_id AND session_id = _session_id;

  -- Increment draft index
  UPDATE game_sessions SET current_draft_index = _expected_index + 1
  WHERE id = _session_id;

  RETURN true;
END;
$$;
```

### File: `src/hooks/useGameStateDB.ts`
- Replace the `draftContestant` function's two parallel DB calls with a single `supabase.rpc('execute_draft_pick', ...)` call
- If the RPC returns `false` (index mismatch), reload state and show a toast: "Pick conflict -- please try again"
- Keep the `isDraftingRef` guard as an additional client-side safeguard

### File: `src/components/DraftMode.tsx`
- Add a "Commissioner: Assign Teams" button (visible only to league admins via `useLeagueRole`)
- When toggled, render a `ManualAssignment` sub-component instead of the interactive draft UI
- The `ManualAssignment` component shows:
  - A card per team with a multi-select or drag list of available contestants
  - Or a simple table: contestant name | team dropdown (reusing the pattern already in AdminPanel Data tab)
  - A "Finalize Assignments" button that batch-updates all contestants and sets draft as complete

### New File: `src/components/ManualAssignment.tsx`
- Props: `contestants`, `draftOrder` (team names), `picksPerTeam`, `onAssign(contestantId, teamName)`, `onFinalize()`
- Shows all contestants in a list, each with a team dropdown
- Validates picks-per-team limits before finalizing
- Calls `onFinalize` which updates `current_draft_index` to totalPicks and transitions to game mode

### File: `src/components/AdminPanel.tsx`
- No changes needed -- the existing Data tab contestant management already supports manual owner edits as a fallback

