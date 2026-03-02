

## Fix: Sync Game Mode to Database

### Problem
The `setMode` function in `useGameStateDB.ts` only saves the mode to `localStorage` and React state -- it **never writes to the database**. This means when leagues transition from draft to game (or any mode change), the `game_sessions.mode` column stays stale. Every league that has completed drafting still shows "draft" in the database, which is why the Admin panel reports incorrect modes.

This also means the mode shown on load comes from `localStorage`, so it only works on the device where the transition happened -- other league members or a fresh browser would see the wrong mode too.

### Solution

#### 1. Fix `setMode` to persist to database
In `src/hooks/useGameStateDB.ts`, update the `setMode` function (line 332-336) to also write the mode to the `game_sessions` table:

```typescript
const setMode = async (mode: GameState["mode"]) => {
  console.log(`Setting mode to: ${mode}`);
  localStorage.setItem(LOCAL_MODE_KEY, mode);
  setState((prev) => ({ ...prev, mode }));
  if (sessionId) {
    await supabase.from("game_sessions").update({ mode }).eq("id", sessionId);
  }
};
```

#### 2. Use DB mode on load instead of localStorage
In `loadGameState` (line 201), change the mode source to prefer the database value over localStorage. This ensures all users in the league see the correct mode:

```typescript
// Use DB mode as the source of truth, fallback to local
const dbMode = session.mode as GameState["mode"];
localStorage.setItem(LOCAL_MODE_KEY, dbMode);
```

#### 3. Fix all existing leagues with a data migration
Run a data update to fix leagues that already completed drafting but are stuck in "draft" mode. The logic: if `current_draft_index >= total expected picks` (all contestants have owners), set mode to "game".

```sql
UPDATE game_sessions gs
SET mode = 'game'
WHERE gs.mode = 'draft'
  AND NOT EXISTS (
    SELECT 1 FROM contestants c
    WHERE c.session_id = gs.id AND c.owner IS NULL
  )
  AND (SELECT count(*) FROM contestants c2 WHERE c2.session_id = gs.id AND c2.owner IS NOT NULL) > 0;
```

This catches Survivor OGs and any other league in the same situation.

### Files to modify
- **`src/hooks/useGameStateDB.ts`** -- fix `setMode` to write to DB; fix `loadGameState` to read mode from DB
- **Database** -- data update to fix existing stuck leagues

