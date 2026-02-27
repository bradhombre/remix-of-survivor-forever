

# Fix: Draft Pick Always Showing "Pick Conflict"

## Problem
The `draftContestant` function reads `currentDraftIndex` from React state, which can become stale after undos, debounced reloads, or race conditions. When this stale value doesn't match the actual database value, the `execute_draft_pick` RPC returns `false` and shows "Pick conflict" every time.

## Solution
Fetch the **fresh** `current_draft_index` directly from the database at the start of `draftContestant`, instead of relying on React state. This guarantees the `_expected_index` sent to the RPC always matches what's actually in the DB.

## Changes

**File: `src/hooks/useGameStateDB.ts`** -- modify `draftContestant` function

Replace the state destructuring with a fresh DB read:

```typescript
// Instead of reading from potentially stale React state:
// const { draftOrder, currentDraftIndex, ... } = state;

// Read fresh draft index from DB
const { data: freshSession } = await supabase
  .from("game_sessions")
  .select("current_draft_index")
  .eq("id", sessionId)
  .single();

if (!freshSession) return;

const currentDraftIndex = freshSession.current_draft_index;
// Keep other values from state (draftOrder, draftType, etc.) since those don't change during drafting
const { draftOrder, draftType, gameType, picksPerTeam: explicitPicks } = state;
```

This ensures the `_expected_index` always matches the DB, eliminating false "pick conflict" errors. The draft order, draft type, and other settings can still come from React state since those don't change mid-draft.

