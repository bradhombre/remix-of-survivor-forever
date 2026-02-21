

# Add "Delete My Account" for Users

## Overview
Users currently have no way to delete their own account. We'll add a new backend function that lets authenticated users delete themselves, and a UI button on the Leagues page to trigger it with a confirmation dialog.

## Changes

### 1. New Edge Function: `supabase/functions/delete-my-account/index.ts`
A dedicated backend function that:
- Authenticates the calling user via their JWT token
- Uses the service role key to clean up related data (league memberships, team assignments, chat messages, owned leagues, etc.)
- Deletes the user's profile row
- Deletes the user from auth using the admin API
- Returns success

This is separate from `admin-users` because it has no admin check -- it only allows a user to delete **themselves**.

### 2. UI: Add "Delete Account" to the Leagues page header
- Add a "Delete Account" option (small destructive button or dropdown item) near the existing "Sign Out" button
- Clicking it opens an AlertDialog with a clear warning: "This will permanently delete your account and remove you from all leagues. This cannot be undone."
- On confirm, calls the edge function, signs out, and redirects to the home page

### 3. Data Cleanup Order (handled in the edge function)
The function will clean up in dependency order:
1. Nullify `user_id` on `league_teams` (free up team slots)
2. Delete from `league_memberships`
3. Delete from `user_roles`
4. Delete from `user_player_mapping`
5. Transfer or delete owned leagues (delete leagues where user is `owner_id` and no other members exist; transfer ownership to another league_admin if members remain)
6. Delete from `profiles`
7. Delete from `auth.users` via admin API

### Files

| File | Change |
|------|--------|
| `supabase/functions/delete-my-account/index.ts` | New edge function for self-service account deletion |
| `src/pages/Leagues.tsx` | Add "Delete Account" button with AlertDialog confirmation |

