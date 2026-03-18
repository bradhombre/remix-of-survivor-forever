

## Fix: Clean Up Game State When Removing a League Member

### The Bug
When a league admin removes a member, only the `league_memberships` row is deleted. The member's `league_teams` assignment, `draft_order` entries, and `contestants` ownership all remain, leaving a ghost team in the draft and game.

### Solution
Enhance `handleRemoveMember` in `LeagueInfo.tsx` to also clean up related data when removing a member:

1. **Nullify `league_teams.user_id`** for the removed user's team in that league (frees the slot for someone else)
2. **Remove their `draft_order` entries** from the active game session
3. **Clear `contestants.owner`** for any contestants assigned to that team name

This should be done as a database function (`remove_league_member`) to keep it atomic and handle the cross-table cleanup in one transaction. The function will:
- Accept `_league_id uuid` and `_user_id uuid`
- Find the team name from `league_teams`
- Find the active `game_session`
- Nullify `league_teams.user_id`
- Delete from `draft_order` where `session_id` and `player_name` match
- Clear `contestants.owner` and `pick_number` where `session_id` and `owner` match
- Delete from `league_memberships`
- Reset `game_sessions.current_draft_index` to 0 and `mode` to 'setup' if draft picks are cleared (to avoid a broken mid-draft state)

### Changes

**Database migration**: Create `remove_league_member(_league_id uuid, _user_id uuid)` security definer function that performs the full cleanup atomically.

**`src/components/LeagueInfo.tsx`**: Update `handleRemoveMember` to call the new RPC instead of directly deleting from `league_memberships`.

