

## Fix: Double-Click Race Condition in Draft

### Problem
When a user clicks two contestants quickly during the draft, both clicks read the same `currentDraftIndex` from React state before either update completes. This causes both picks to be assigned to the same drafter (Brad got 2 picks, both with pick_number=1).

### Solution
Add a drafting lock (ref-based guard) to prevent concurrent draft picks from executing.

### Changes

**File 1: `src/hooks/useGameStateDB.ts`** -- Add concurrency guard

- Add a `useRef` boolean flag (`isDraftingRef`) that acts as a mutex
- At the start of `draftContestant`, check the flag and return early if already drafting
- Set the flag to `true` before the DB calls, and `false` after they complete
- This prevents a second click from executing while the first is still in-flight

**File 2: `src/components/DraftMode.tsx`** -- Add UI-level double-click prevention

- Add a local `isDrafting` state that disables all contestant buttons while a pick is being processed
- Set it `true` before calling `onDraftContestant`, reset after a short delay (or via a callback)
- This provides visual feedback (disabled buttons) and a secondary guard

### Technical Details

In `useGameStateDB.ts`, the guard looks like:
```typescript
const isDraftingRef = useRef(false);

const draftContestant = async (contestantId: string) => {
  if (isDraftingRef.current) return;
  isDraftingRef.current = true;
  try {
    // ... existing logic ...
  } finally {
    isDraftingRef.current = false;
  }
};
```

In `DraftMode.tsx`, buttons get `disabled={isDrafting}` to prevent interaction during processing.

