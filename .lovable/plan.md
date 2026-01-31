
# Add Avatar Upload to Leaderboard

## Overview
Enable users to update their team avatar directly from the leaderboard on the Play tab. Clicking on your own team's avatar will open a file picker, upload the image to storage, and update the avatar across the app - the same flow used in the League tab.

## Current State
- Leaderboard shows team avatars via `TeamAvatar` component
- Legacy avatar upload only appears when there's NO team avatar (for backward compatibility)
- The League tab has full avatar upload via `TeamAvatarUpload` component

## Solution

### Changes Required

| File | Change |
|------|--------|
| `src/components/GameMode.tsx` | Accept `currentUserId` prop, use `getMyTeam` from `useLeagueTeams`, add upload overlay for user's own team avatar |

### Implementation Details

1. **Pass current user ID to GameMode**
   - `LeagueDashboard.tsx` already has access to the authenticated user
   - Pass `user.id` as a new `currentUserId` prop to `GameMode`

2. **Identify user's team in leaderboard**
   - Use `getMyTeam(currentUserId)` from the existing `useLeagueTeams` hook
   - Compare each leaderboard entry to see if it belongs to the current user

3. **Add upload overlay for user's own team**
   - When the user hovers over their own team's avatar, show a camera/upload icon overlay
   - Use the same upload logic from `TeamAvatarUpload` (upload to Supabase storage, update `league_teams`)
   - Provide visual feedback when uploading (spinner)

4. **Sync with League tab**
   - Use `updateTeam` from `useLeagueTeams` to save the new avatar URL
   - Real-time subscription will automatically update both views

### Visual Behavior

```text
Other team's avatar:         Your team's avatar:
┌─────────────┐              ┌─────────────┐
│             │              │             │
│   Avatar    │              │   Avatar    │  <- Hover shows camera overlay
│  (static)   │              │   📷        │
│             │              │             │
└─────────────┘              └─────────────┘
                                   ↓
                             Click to upload
```

### Code Approach

```tsx
// In GameMode.tsx - identify user's team
const { teams, getMyTeam, updateTeam } = useLeagueTeams({ leagueId });
const myTeam = getMyTeam(currentUserId);

// In leaderboard render - check if this entry is the user's team
const isMyTeam = myTeam?.name === entry.player;

// Show upload overlay for own team
{isMyTeam ? (
  <TeamAvatarUpload ... />  // Reuse existing component
) : (
  <TeamAvatar ... />  // Static display for others
)}
```

## Files to Modify

1. **`src/pages/LeagueDashboard.tsx`**
   - Pass `currentUserId={user?.id}` to `GameMode`

2. **`src/components/GameMode.tsx`**
   - Add `currentUserId?: string` prop
   - Import `TeamAvatarUpload` component
   - Use `getMyTeam` and `updateTeam` from `useLeagueTeams`
   - Replace static avatar with uploadable version for user's own team

## Benefits

- Consistent avatar management across Play and League tabs
- Intuitive - users naturally expect to click their avatar to change it
- Single source of truth (league_teams table + Supabase storage)
- Real-time sync between all views
