

## Fix Draft Premature Start + Add "Revert to Setup" for Commissioners

### Problem Analysis

After investigating the database, the pattern is clear:

- Most leagues have only **1 filled team** (just the commissioner) when drafts are being started
- Several leagues show drafted contestants but low `current_draft_index`, meaning commissioners started drafting alone
- There is **no way to revert** a started draft back to setup mode
- The `mode` field in the database is never updated (it stays "setup" forever) -- mode is only stored in localStorage per browser

### Two Changes

#### 1. Warn commissioners before starting a draft with unfilled team slots

Add a confirmation dialog when the commissioner clicks "Start Draft" and there are empty team slots. Something like:

> "Only 1 of 4 team slots are filled. Players who haven't joined yet won't be able to draft. Are you sure you want to start?"

This doesn't block them (they may want to draft for absent friends), but makes the consequence obvious.

**File: `src/components/SetupMode.tsx`**
- Add a prop for `filledTeamCount` (or derive it from existing `teams` data already available)
- Wrap `onStartDraft` with a confirmation check when `filledCount < teams.length`

**File: `src/pages/LeagueDashboard.tsx`**
- Update `handleStartDraft` to pass through the warning logic, or pass `filledTeamCount` to SetupMode

#### 2. Add a "Revert to Setup" button for commissioners

Allow league admins to undo a draft and return to setup mode. This clears all draft picks (contestant owners and pick numbers) and resets `current_draft_index` to 0.

**File: `src/hooks/useGameStateDB.ts`**
- Add a `revertToSetup` function that:
  - Resets `current_draft_index` to 0 in `game_sessions`
  - Clears `owner` and `pick_number` on all contestants for that session
  - Sets localStorage mode back to "setup"
  - Reloads the game state

**File: `src/pages/LeagueDashboard.tsx`**
- Show a "Revert to Setup" button on the **Draft tab** (visible to league admins only) when the draft is in progress but not complete
- Include a double-confirmation dialog since this is destructive

**File: `src/components/AdminPanel.tsx`**
- Also add a "Revert to Setup" option in the Admin > Data tab as a safety net

### Technical Details

**SetupMode.tsx changes:**
- The component already has access to `teams` via `useLeagueTeams` and computes `filledCount` at line 129
- Add a `window.confirm()` before calling `onStartDraft` when `filledCount < leagueSize`

**useGameStateDB.ts -- new `revertToSetup` function:**
```text
const revertToSetup = async () => {
  if (!sessionId) return;
  // Reset draft index
  await supabase.from("game_sessions")
    .update({ current_draft_index: 0 })
    .eq("id", sessionId);
  // Clear all draft assignments
  await supabase.from("contestants")
    .update({ owner: null, pick_number: null })
    .eq("session_id", sessionId);
  // Reset local mode
  localStorage.setItem(LOCAL_MODE_KEY, "setup");
  // Reload state
  await loadGameState(sessionId);
};
```

**LeagueDashboard.tsx -- Revert button placement:**
- On the Draft tab, when `isLeagueAdmin` and draft is in progress (contestants have owners but draft isn't complete), show a small "Revert to Setup" button with a warning icon
- Uses double `confirm()` dialogs to prevent accidental clicks

### Files to Edit
- `src/components/SetupMode.tsx` -- add unfilled-slots warning before starting draft
- `src/hooks/useGameStateDB.ts` -- add `revertToSetup` function
- `src/pages/LeagueDashboard.tsx` -- add Revert to Setup button on Draft tab, pass through new function

