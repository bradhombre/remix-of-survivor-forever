
# Add "Delete League" Option for League Owners

## Problem
As a league owner, there's no way to delete a league you created. The "Leave League" button only shows for non-owners, and "Delete League" only exists in the super admin panel.

## Solution
Add a "Delete League" section to the League Info/Settings page (`LeagueInfo.tsx`) that appears only for league owners, replacing the "Leave League" section they currently don't see.

### Changes

**File: `src/components/LeagueInfo.tsx`**

1. Add a `isDeleting` state variable
2. Add a `handleDeleteLeague` function that:
   - Deletes related data (game_sessions, contestants, scoring_events, league_teams, chat_messages, scoring_templates, archived_seasons, league_memberships) for the league
   - Deletes the league itself
   - Navigates back to `/leagues` on success
3. Add a "Delete League" card section (visible only to the owner) after the Members card, styled with destructive colors and a confirmation dialog warning that all league data will be permanently removed

The delete will cascade through related tables in the correct order to avoid foreign key issues, similar to how the `delete-my-account` edge function handles it.
