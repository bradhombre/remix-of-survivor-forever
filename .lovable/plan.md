

# Add Display Names and Online Users List

## Overview
This plan adds a `display_name` column to user profiles and enhances the chat to show who is currently online in the league.

## Changes Summary

### 1. Database: Add display_name column
Add a nullable `display_name` text column to the `profiles` table with a max length of 50 characters.

### 2. Update Profile Fetching
Modify the hooks to fetch and use `display_name` when available, falling back to the email username (portion before @) when not set.

### 3. Display Name Priority Logic
- If user has set a `display_name`, show that
- Otherwise, show the first part of their email (before @)

### 4. Online Users Popover
Add a clickable popover in the chat header that shows the list of currently online users with their display names and a visual indicator.

### 5. Profile Settings Option
Users can set their display name from the League tab's "My Team" section or a new profile section.

---

## Technical Details

### Database Migration
```sql
ALTER TABLE public.profiles 
ADD COLUMN display_name text;

-- Add constraint for reasonable length
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_display_name_length 
CHECK (char_length(display_name) <= 50);
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useChatMessages.ts` | Fetch `display_name` from profiles, add to ChatMessage interface |
| `src/hooks/useChatPresence.ts` | Add `display_name` to PresenceUser interface and track it |
| `src/components/ChatMessage.tsx` | Update to accept and display `displayName` prop |
| `src/components/LeagueChat.tsx` | Add online users popover, pass user's display name to presence hook |
| `src/pages/LeagueDashboard.tsx` | Fetch and pass user's display name to LeagueChat |

### New Component
Create a small `OnlineUsersPopover` component to show the list of online users when clicking the "X online" indicator.

### Data Flow
1. On page load, fetch user's profile including `display_name`
2. Pass `display_name` (or email fallback) to `LeagueChat`
3. `useChatPresence` tracks each user with their display name
4. Chat header shows popover with online users list
5. Messages show display name instead of email

### Display Name Helper Function
```typescript
function getDisplayName(displayName: string | null, email: string): string {
  return displayName?.trim() || email.split("@")[0];
}
```

### Online Users Popover UI
- Green dot indicator + "X online" text (existing)
- Clicking opens a small popover showing list of online users
- Each user shows: green status dot + display name
- Current user shown with "(you)" suffix

