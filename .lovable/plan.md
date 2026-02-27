

# Fix: Draft Picks Vanishing Due to Race Condition

## Problem

When you make a draft pick, the atomic RPC (`execute_draft_pick`) succeeds -- it updates both the contestant's owner AND increments the draft index in a single transaction. However, the UI has **no optimistic update**. It relies entirely on realtime subscriptions to refresh the state.

When the RPC commits, it triggers **two** simultaneous realtime events (one for `game_sessions` table change, one for `contestants` table change). Both independently call `loadGameState()`, which does a full database reload and calls `setState()`. These two concurrent reloads race against each other -- if they overlap, the second `setState` can overwrite the first with data from a slightly different read timing, causing the pick to appear to vanish while the draft index has already advanced.

## Solution

Two changes to `src/hooks/useGameStateDB.ts`:

### 1. Add optimistic UI update after successful draft pick
After the RPC returns `success = true`, immediately update local state to show the pick without waiting for realtime. This makes the pick appear instantly and prevents any flicker.

### 2. Debounce realtime `loadGameState` calls
Add a debounce mechanism so that when multiple realtime events fire within a short window (e.g., 300ms), only one `loadGameState` call executes. This prevents the concurrent reload race condition.

## Technical Details

**File: `src/hooks/useGameStateDB.ts`**

**Change 1 -- Optimistic update (inside `draftContestant`, after successful RPC):**
After `success` is confirmed (line 502), add:
```typescript
// Optimistic UI update
setState((prev) => ({
  ...prev,
  currentDraftIndex: currentDraftIndex + 1,
  contestants: prev.contestants.map((c) =>
    c.id === contestantId ? { ...c, owner, pickNumber } : c
  ),
}));
```

**Change 2 -- Debounce realtime reloads:**
Add a `reloadTimerRef` and wrap the realtime callbacks so multiple events within 300ms coalesce into a single `loadGameState` call:
```typescript
const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const debouncedReload = useCallback(() => {
  if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
  reloadTimerRef.current = setTimeout(() => {
    if (sessionId) loadGameState(sessionId);
  }, 300);
}, [sessionId]);
```

Then replace all `() => loadGameState(sessionId)` callbacks in the realtime subscription with `debouncedReload`.

These two changes together ensure picks appear instantly and prevent concurrent reloads from overwriting each other.
