

# Fix: Duplicate Teams in Draft Order

## Problem
The `draft_order` table has no unique constraint, so when `setDraftOrder` is called concurrently (e.g., from rapid UI clicks or realtime-triggered reloads racing with writes), the delete-then-insert pattern allows duplicate rows to be created. This causes teams to appear multiple times in the draft UI.

Multiple sessions in production already have duplicate draft_order rows (e.g., session `130db811` has "Team 1" twice at position 0).

## Solution

### 1. Database migration: Clean up duplicates and add unique constraint

A single SQL migration that:
- Removes existing duplicate rows (keeping only one per session+position pair)
- Adds a UNIQUE constraint on `(session_id, player_name)` to prevent future duplicates at the DB level

```sql
-- Remove duplicates, keeping the oldest row per (session_id, player_name)
DELETE FROM draft_order a
USING draft_order b
WHERE a.session_id = b.session_id
  AND a.player_name = b.player_name
  AND a.created_at > b.created_at;

-- Also handle exact timestamp ties by keeping lower id
DELETE FROM draft_order a
USING draft_order b
WHERE a.session_id = b.session_id
  AND a.player_name = b.player_name
  AND a.created_at = b.created_at
  AND a.id > b.id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE draft_order ADD CONSTRAINT draft_order_session_player_unique 
  UNIQUE (session_id, player_name);
```

### 2. Code fix: Use upsert in `setDraftOrder` (src/hooks/useGameStateDB.ts)

Replace the delete-then-insert pattern with an **upsert** approach using `onConflict`. This is atomic and idempotent -- even if called concurrently, it won't create duplicates:

```typescript
// In setDraftOrder: replace delete+insert with:
// 1. Delete teams no longer in the order
// 2. Upsert current order
const { error: deleteError } = await supabase
  .from("draft_order")
  .delete()
  .eq("session_id", sessionId)
  .not("player_name", "in", `(${draftOrder.map(p => `"${p}"`).join(",")})`);

const rows = draftOrder.map((player, index) => ({
  session_id: sessionId,
  player_name: player,
  position: index,
}));

const { error: upsertError } = await supabase
  .from("draft_order")
  .upsert(rows, { onConflict: "session_id,player_name" });
```

### 3. Code fix: Deduplicate in `loadGameState` reconciliation (src/hooks/useGameStateDB.ts)

As a safety net, deduplicate the draft order when loading from DB:

```typescript
// After line 155: const dbOrder = draftData.data.map((d) => d.player_name);
// Deduplicate while preserving order
const dbOrder = [...new Set(draftData.data.map((d) => d.player_name))];
```

This three-layer approach (DB constraint + upsert writes + deduplicated reads) ensures duplicates can never happen again and existing data is cleaned up.

