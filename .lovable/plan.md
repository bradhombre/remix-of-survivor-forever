

# Push Notifications + @Mention Autocomplete for Chat

## Overview
Add two features to the chat system:
1. **Toast notifications** for new messages when the chat widget is minimized
2. **@mention autocomplete** to easily tag JeffBot or other league members

## Feature 1: Chat Notifications

When the chat widget is minimized and a new message arrives, show a toast notification with the sender's name and a preview of the message. Clicking the notification opens the chat.

### Implementation
- Add a callback prop `onNewMessage` to `useChatMessages` hook
- In `LeagueChat`, trigger a toast notification when:
  - Chat is collapsed (`!isExpanded`)
  - New message arrives from someone else (not from current user)
- Toast will show sender name and truncated message content
- Clicking toast expands the chat

### Files to Modify
| File | Changes |
|------|---------|
| `src/hooks/useChatMessages.ts` | Add callback for new messages, pass to realtime handler |
| `src/components/LeagueChat.tsx` | Subscribe to new messages, show toast when collapsed |

---

## Feature 2: @Mention Autocomplete

When user types `@` in the chat input, show a dropdown with mentionable options:
- **JeffBot** (always available)
- **Online league members** (team names from presence)

Selecting an option inserts `@name ` into the input.

### UI Design
- Popover appears above the input when typing `@`
- Filters as user continues typing (e.g., `@bra` filters to "Brad")
- Up/Down arrow keys navigate, Enter/Tab selects
- Clicking an option selects it
- Escape or clicking outside dismisses without selection

### Implementation Approach
1. Track cursor position and detect `@` trigger
2. Extract the partial mention text after `@`
3. Filter mentionable users based on partial text
4. Render a popover with filtered options
5. Handle keyboard navigation and selection
6. Insert mention and close popover on selection

### Mentionable List
- Always include: `jeffbot` (displays as "JeffBot 🏝️")
- Include all team members from the league (from `useLeagueTeams`)
- Prioritize online users at top

### Files to Modify/Create
| File | Changes |
|------|---------|
| `src/components/ChatMentionInput.tsx` | **NEW** - Input with mention autocomplete functionality |
| `src/components/LeagueChat.tsx` | Replace plain `Input` with `ChatMentionInput`, pass league teams |
| `src/pages/LeagueDashboard.tsx` | Pass full teams list to `LeagueChat` |

---

## Technical Details

### ChatMentionInput Component Props
```typescript
interface ChatMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  mentionableUsers: MentionableUser[];
  inputRef?: React.RefObject<HTMLInputElement>;
}

interface MentionableUser {
  id: string;
  name: string;
  isBot?: boolean;
  isOnline?: boolean;
}
```

### Mention Detection Logic
```typescript
// Find the last @ before cursor
const lastAtIndex = value.lastIndexOf('@', cursorPosition - 1);
if (lastAtIndex >= 0) {
  // Check no space between @ and cursor
  const textAfterAt = value.slice(lastAtIndex + 1, cursorPosition);
  if (!textAfterAt.includes(' ')) {
    // Show popover with filtered users
    const query = textAfterAt.toLowerCase();
    const filtered = mentionableUsers.filter(u => 
      u.name.toLowerCase().includes(query)
    );
  }
}
```

### Notification Toast
```typescript
// When new message arrives while collapsed
toast(
  <div 
    className="cursor-pointer" 
    onClick={() => setIsExpanded(true)}
  >
    <div className="font-medium">{senderName}</div>
    <div className="text-sm text-muted-foreground truncate">
      {messageContent.slice(0, 50)}...
    </div>
  </div>,
  { duration: 5000 }
);
```

### Data Flow

```text
LeagueDashboard
    |
    +-- useLeagueTeams() -> teams[]
    |
    +-- LeagueChat
            |-- teams (for mention suggestions)
            |-- onlineUsers (from useChatPresence)
            |
            +-- ChatMentionInput
                    |-- mentionableUsers = [
                    |       { id: 'jeffbot', name: 'JeffBot 🏝️', isBot: true },
                    |       ...teams.map(t => ({ id: t.user_id, name: t.name, isOnline: ... }))
                    |   ]
                    |
                    +-- Popover (shows on @ trigger)
                            |-- filtered options
                            |-- keyboard navigation
```

---

## Expected Behavior

### Notifications
1. User has chat minimized (collapsed FAB button)
2. Another user or JeffBot sends a message
3. Toast appears: "**TeamName** sent a message..."
4. Clicking toast opens chat and scrolls to bottom
5. No notification for user's own messages

### @Mentions
1. User types `@` in input
2. Popover appears with JeffBot + all team members
3. User types more (`@jef`) -> filters to "JeffBot"
4. User presses Enter or clicks -> `@jeffbot ` inserted
5. Popover closes, cursor is after the inserted mention
6. User can continue typing their message

