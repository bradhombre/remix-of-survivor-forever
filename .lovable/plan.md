

# Default Chat Display Name to Team Name

## Overview
Update the chat system to use the user's **team name** (from `league_teams`) as their display name in chat, instead of requiring a separate "Chat Display Name" field.

## Current Behavior
- Chat display name comes from `profiles.display_name` (global across all leagues)
- If not set, falls back to email username
- Requires users to manually set a separate "Chat Display Name"

## New Behavior
- Chat display name will automatically use the user's **team name** for that league
- If no team is claimed, fall back to email username
- No need for a separate "Chat Display Name" field

## Changes Summary

### 1. Update `useChatMessages.ts`
- When fetching messages, also query `league_teams` to get team names for users
- Join user_id to league_teams.user_id where league_id matches
- Use team name as display name, falling back to email username

### 2. Update `useChatPresence.ts`
- Accept `userTeamName` prop instead of relying on display_name from profiles
- Track team name in presence state

### 3. Update `LeagueChat.tsx`
- Pass user's team name (from `useLeagueTeams` hook) instead of profile display_name

### 4. Update `LeagueDashboard.tsx`
- Remove the profile display_name fetch (no longer needed for chat)
- Pass the user's team name to `LeagueChat`

### 5. Update `LeagueInfo.tsx`
- Remove the "Chat Display Name" section since it's now automatic

---

## Technical Details

### Display Name Priority (Updated)
1. User's team name for the current league (from `league_teams`)
2. Email username (fallback if no team claimed)

### Updated Data Flow

| Component | Change |
|-----------|--------|
| `useChatMessages.ts` | Fetch team names from `league_teams` instead of `profiles.display_name` |
| `useChatPresence.ts` | Rename prop from `userDisplayName` to `userTeamName` for clarity |
| `LeagueChat.tsx` | Get team name from `useLeagueTeams().getMyTeam()` |
| `LeagueDashboard.tsx` | Remove profile fetch, use team name from existing state |
| `LeagueInfo.tsx` | Remove "Chat Display Name" editor section |

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useChatMessages.ts` | Query `league_teams` for user team names instead of profiles.display_name |
| `src/hooks/useChatPresence.ts` | Update prop name for clarity |
| `src/components/LeagueChat.tsx` | Use `useLeagueTeams` to get current user's team name |
| `src/pages/LeagueDashboard.tsx` | Simplify - no need to fetch profile display_name |
| `src/components/LeagueInfo.tsx` | Remove "Chat Display Name" section |
| `src/lib/displayNameUtils.ts` | Update helper to accept teamName parameter |

### Example Query Change

**Before (profiles.display_name):**
```typescript
const { data: profiles } = await supabase
  .from("profiles")
  .select("id, email, display_name")
  .in("id", userIds);
```

**After (league_teams.name):**
```typescript
const { data: teams } = await supabase
  .from("league_teams")
  .select("user_id, name")
  .eq("league_id", leagueId)
  .in("user_id", userIds);
```

### Display Name Helper Update

```typescript
// Updated to use team name
export function getDisplayName(teamName: string | null | undefined, email: string): string {
  const trimmed = teamName?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return email.split("@")[0];
}
```

## Benefits
- Simpler UX: No need to set a separate display name
- Consistent identity: Users are identified by their team name across the league
- Automatic: When users update their team name, chat reflects it immediately

