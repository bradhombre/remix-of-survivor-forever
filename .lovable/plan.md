

# Fix: Admin Team Assignment for Survivor OGs League

## Problem
In the "Survivor OGs" league, you (the admin) are not assigned to any team slot, and there's no way to manually assign league members to specific team slots. The current system only supports auto-assignment when joining via invite code.

## Immediate Data Fix
Run a quick database update to assign you to the correct team slot (e.g., "Kalin" at position 3):

This will be handled via a migration or direct query to set your `user_id` on the appropriate team.

## Feature: Admin Team Assignment UI

Add a team assignment dropdown in the Setup tab so league admins can manually assign or reassign members to any team slot.

### Changes

**1. `src/components/SetupMode.tsx`**
- For each team slot row, add a dropdown (visible to league admins) that lets them assign any league member to that slot
- The dropdown shows all league members and allows "Unassign" as well
- When a member is assigned to a new slot, their previous slot (if any) is cleared first

### How it works
- Each team row gets a small "Assign" button (or a Select dropdown) next to the team name
- Clicking it shows league members who are not yet assigned to a team, plus the currently assigned user
- Selecting a member updates `league_teams.user_id` for that row
- Selecting "Unassign" sets `user_id` to null

### Technical Details

```text
Team Slot Row (current):
  [Avatar] 1. Brad -- kalinmckenna@gmail.com  [Edit]

Team Slot Row (new, for admins):
  [Avatar] 1. Brad  [Assign: dropdown of members]  [Edit]
```

- Query `league_memberships` joined with `profiles` to get available members
- Filter out members already assigned to other teams
- Use existing `updateTeam` from `useLeagueTeams` to set `user_id`
- The RLS policy "League admins can update teams" already permits this

**2. Quick fix for your specific league**
- Database update to assign your user (`0b902fd8-5ed1-4869-bd1d-0ca959fdedee`) to the "Kalin" team slot (position 3) in the Survivor OGs league -- or whichever slot you prefer. I'll ask which one before running it.

### Files modified
- `src/components/SetupMode.tsx` -- add admin team assignment dropdown to each slot

