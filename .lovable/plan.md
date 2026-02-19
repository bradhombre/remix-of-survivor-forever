

# Fix: Prevent Double Import of Cast

## Problem
Clicking "Import Cast" multiple times (or navigating back then forward to step 3) inserts duplicate contestants because there's no guard checking whether contestants already exist for this session.

## Solution
Two simple fixes in `src/components/CreateLeagueDialog.tsx`:

1. **Early guard in `handleImportCast`**: Before inserting, check if contestants already exist for this session. If they do, skip the insert and just set the count.

2. **Disable the button immediately**: Add `importedCount !== null` as a disable condition on the import button (this already happens via the conditional render, but the early guard protects against race conditions).

### Technical change in `handleImportCast`:

Before fetching from `master_contestants`, query the `contestants` table for this session. If rows already exist, set `importedCount` to that count and return early without inserting.

```typescript
// Add at the top of handleImportCast, after the sessionId check:
const { count: existingCount } = await supabase
  .from('contestants')
  .select('id', { count: 'exact', head: true })
  .eq('session_id', sessionId);

if (existingCount && existingCount > 0) {
  setImportedCount(existingCount);
  toast.info('Cast already imported!');
  return;
}
```

### File modified:
- `src/components/CreateLeagueDialog.tsx` -- add the duplicate check at the start of `handleImportCast`

