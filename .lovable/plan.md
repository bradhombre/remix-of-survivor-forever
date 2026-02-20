
# Commissioner Checklist UX Improvements

## Changes

### 1. Auto-dismiss when game starts
Add a `useEffect` that watches the `mode` prop. When `mode === "game"`, automatically save dismissal to `localStorage` and hide the checklist -- the user no longer needs it once scoring begins.

### 2. Mark "Customize scoring" as optional
Add an "(Optional)" badge next to the scoring step label and use a dashed border style instead of solid, so it visually communicates that skipping it is fine.

### 3. Limit visibility to setup and draft phases
In `LeagueDashboard.tsx`, re-add a mode guard so the checklist only renders when `state.mode === "setup" || state.mode === "draft"`. Combined with the auto-dismiss, this ensures it never lingers into the active game.

### 4. Remove dead code
Remove the empty `if (allDone && !dismissed)` block that currently does nothing.

---

## Technical Details

### `src/components/CommissionerChecklist.tsx`

- Add `useEffect` import
- Add effect: when `mode === "game"`, call `handleDismiss()` automatically
- Remove the empty `if (allDone && !dismissed)` block
- For the "scoring" step, render an `(Optional)` badge next to the label and use `border-dashed` styling when not done

### `src/pages/LeagueDashboard.tsx`

- Change the checklist guard from just `isLeagueAdmin && viewMode === "play"` back to `isLeagueAdmin && viewMode === "play" && (state.mode === "setup" || state.mode === "draft")`
