

## Fix: Draft Tab Disappears When No Draft Order Exists

### The Bug (confirmed)

When a league has no draft order configured yet, `totalPicks` equals 0, making `canShowGame = (0 >= 0) = true`. This hides the Draft tab entirely, leaving players with no way to interact with the draft.

### The Fix

**File: `src/pages/LeagueDashboard.tsx`** (line 119)

Change:
```
const canShowGame = state.currentDraftIndex >= totalPicks;
```
To:
```
const canShowGame = totalPicks > 0 && state.currentDraftIndex >= totalPicks;
```

This single guard ensures the Draft tab remains visible until a real draft with actual picks has been completed. One line, one file.

