

## User Feedback: "Can't find how to delete a league"

### Current State

The "Delete League" option already exists. It's located at the bottom of the **League** tab (the "League Info" section) inside a league's dashboard (`/league/:id`). Only the league owner can see it. The problem is purely discoverability -- users don't think to look inside the league they want to delete.

### Proposed Improvement: Add Delete Option on the Leagues List Page

Add a context menu or action to each league card on the `/leagues` page so owners can delete directly from the list without entering the league first.

**Changes:**

1. **`src/pages/Leagues.tsx`** -- For league cards where the user is the owner (league_admin role), add a small dropdown menu (kebab/three-dot icon) in the card corner with a "Delete League" option. Clicking it opens the same confirmation dialog pattern already used elsewhere. On confirm, call `supabase.rpc('delete_league', { league_uuid })` and refresh the list.

   - Fetch `owner_id` alongside existing league data to determine ownership (or infer from `league_admin` role)
   - Add a stop-propagation handler so clicking the menu doesn't navigate into the league
   - Reuse the existing `AlertDialog` pattern for confirmation

2. **No database or backend changes needed** -- the `delete_league` RPC and ownership check already exist.

### Technical Detail

The leagues query in `fetchMemberships` needs to also select `owner_id` from the `leagues` join so we can conditionally show the delete action only for the league owner (not just any league_admin).

