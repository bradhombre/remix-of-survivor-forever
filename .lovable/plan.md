
# Let Users Name Their Team and Upload Photo When Creating/Joining

## Problem
Currently, when users create or join a league:
- They're auto-assigned to a generic team slot like "Team 1"
- Only admins can rename teams
- There's no way to upload a team photo

Users should be able to personalize their team right from the start.

## Solution Overview
Add a two-step flow when creating/joining a league:
1. First: Enter league name (create) or invite code (join)
2. Second: Customize your team (name + optional photo)

Also add a "My Team" section in the League tab where users can update their team name and photo anytime.

## Database Changes

### Add `avatar_url` column to `league_teams`
| Column | Type | Notes |
|--------|------|-------|
| `avatar_url` | text | Nullable, stores URL to team photo |

### Create storage bucket for team photos
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('team-avatars', 'team-avatars', true);
```

### RLS policies for storage
- Allow authenticated users to upload their own team avatar
- Allow anyone to view avatars (public bucket)

## File Changes

| File | Change |
|------|--------|
| `src/components/CreateLeagueDialog.tsx` | Add second step for team customization after league creation |
| `src/components/JoinLeagueDialog.tsx` | Add second step for team customization after joining |
| `src/components/LeagueInfo.tsx` | Add "My Team" card where users can edit their team name + photo |
| `src/hooks/useLeagueTeams.ts` | Add `updateTeamAvatar` function, include `avatar_url` in type |
| `src/components/SetupMode.tsx` | Display team avatars in the admin team list |

## UI Flow

### Create League Flow
```text
Step 1: [League Name Input] -> [Create Button]
        ↓
Step 2: "You're Team 1! Customize your team:"
        [Team Name Input]
        [Upload Team Photo] (optional)
        [Done Button]
```

### Join League Flow
```text
Step 1: [Invite Code Input] -> [Join Button]
        ↓
Step 2: "Welcome! You've been assigned to [Team Name]. Customize your team:"
        [Team Name Input]
        [Upload Team Photo] (optional)
        [Done Button]
```

### League Tab - My Team Section
New card at the top of LeagueInfo showing:
- Current team name (editable)
- Current team photo (with upload button)
- Position number in the league

## Technical Details

### CreateLeagueDialog Changes
- Add `step` state (1 or 2)
- After successful league creation, transition to step 2
- Store the team ID returned from the `create_league` function (requires function update)
- Step 2 shows team name input and photo upload
- On "Done", update the team via Supabase

### JoinLeagueDialog Changes
- Add `step` state (1 or 2)
- After successful join, transition to step 2
- The `join_league` function already returns membership data; need to also get team info
- Step 2 shows team name input and photo upload
- On "Done", update the team via Supabase

### Image Upload Flow
1. User selects image file
2. Upload to `team-avatars` bucket with path `{league_id}/{team_id}.{ext}`
3. Get public URL
4. Save URL to `league_teams.avatar_url`

### RLS Update for league_teams
Add policy: "Users can update their own team name and avatar"
```sql
CREATE POLICY "Users can update own team"
ON league_teams FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## Benefits
- Personal connection: Users feel ownership of their team from the start
- Better UX: No need to hunt for where to customize your team
- Flexibility: Can always update later in the League tab
- Visual appeal: Team photos make the league feel more personalized
