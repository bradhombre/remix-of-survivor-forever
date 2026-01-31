

# League Live Chat + JeffBot Implementation

## Overview

This plan implements a real-time chat system for each league with an AI-powered "JeffBot" assistant that can answer Survivor trivia questions. The chat appears as a floating widget on the league dashboard.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                      LeagueDashboard                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Main Content Area                        │  │
│  │                  (Play/History/League/Admin)              │  │
│  │                                                           │  │
│  │                                                           │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                           ┌───────────────────┐ │
│                                           │  Chat Widget      │ │
│                                           │  (Floating)       │ │
│                                           │  - Collapsed: fab │ │
│                                           │  - Expanded: 350w │ │
│                                           └───────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Phase 1: Database Schema

Create the `chat_messages` table with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key, auto-generated |
| `league_id` | uuid | Reference to leagues table (cascade delete) |
| `user_id` | uuid | Reference to auth.users |
| `content` | text | Message content (max 500 chars) |
| `is_bot` | boolean | True for JeffBot messages |
| `reactions` | jsonb | Emoji reactions storage |
| `created_at` | timestamp | Message timestamp |

**Row Level Security:**
- SELECT: Users can view messages in leagues they belong to
- INSERT: Users can insert messages in leagues they belong to

**Indexes:**
- Composite index on `(league_id, created_at)` for efficient message queries
- Enable realtime for the table

### Phase 2: Chat UI Component

Create a floating chat widget (`src/components/LeagueChat.tsx`) with:

**Collapsed State:**
- Circular floating button in bottom-right corner
- Chat icon with unread count badge
- Persists collapsed/expanded state in localStorage

**Expanded State:**
- 350px wide, 450px tall floating panel
- Header: "League Chat" title, online indicator, minimize button
- Message list: Scrollable, auto-scroll on new messages
- Each message shows: sender name, timestamp, content
- Bot messages: Different background color, "JeffBot" label
- Input area: Text field (500 char limit), send button

**Mobile Behavior:**
- Takes fuller width (95% of viewport)
- Clear close button
- Still floats over content

**Real-time Updates:**
- Subscribe to `chat_messages` table changes for the league
- New messages appear instantly for all users
- Typing indicator when waiting for JeffBot response

### Phase 3: JeffBot Edge Function

Create `supabase/functions/jeffbot/index.ts` that:

1. Receives `league_id`, `user_id`, and `question` parameters
2. Fetches the current season from the league's game session
3. Calls Lovable AI with a carefully crafted system prompt:
   - Acts as a friendly Survivor superfan
   - Knows Survivor history, challenges, player stats, trivia
   - Uses Jeff Probst catchphrases occasionally
   - NEVER reveals current season spoilers
   - Keeps responses brief (2-3 sentences)
4. Inserts the bot response as a chat message with `is_bot = true`
5. Returns success/error status

**Lovable AI Integration:**
- Uses `google/gemini-3-flash-preview` model via the Lovable AI Gateway
- LOVABLE_API_KEY is already available as a secret

### Phase 4: JeffBot Trigger in Chat

When a user sends a message starting with `@jeffbot`:

1. Insert the user's message normally
2. Show typing indicator in chat
3. Call the jeffbot edge function with the question text
4. Bot response appears via realtime subscription
5. On error, show toast: "JeffBot is taking a break, try again"

### Phase 5: Chat Polish Features

**Presence Tracking:**
- Track active users using Supabase Realtime Presence
- Show green dot and "X online" when others are active
- Update presence on focus/blur events

**Date Separators:**
- Group messages by date
- Show "Today", "Yesterday", or full date between message groups

**Emoji Reactions:**
- Three quick reactions: thumbsUp, fire, laughing
- Stored in JSONB column as `{ emoji: [userId, userId, ...] }`
- Click to toggle reaction
- Show reaction counts on messages

**Rate Limiting:**
- Client-side: 1 message per 2 seconds
- Show disabled state on send button during cooldown

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp].sql` | Create | Add chat_messages table, RLS, indexes |
| `supabase/functions/jeffbot/index.ts` | Create | JeffBot AI edge function |
| `supabase/config.toml` | Modify | Register jeffbot function |
| `src/components/LeagueChat.tsx` | Create | Main floating chat widget component |
| `src/components/ChatMessage.tsx` | Create | Individual message component with reactions |
| `src/hooks/useChatMessages.ts` | Create | Hook for fetching and subscribing to messages |
| `src/hooks/useChatPresence.ts` | Create | Hook for tracking online users |
| `src/pages/LeagueDashboard.tsx` | Modify | Add LeagueChat component |

## Technical Notes

### Real-time Subscription Pattern

Following the existing pattern in `useGameStateDB.ts`:

```typescript
const channel = supabase
  .channel(`chat-${leagueId}`)
  .on(
    "postgres_changes",
    { 
      event: "INSERT", 
      schema: "public", 
      table: "chat_messages", 
      filter: `league_id=eq.${leagueId}` 
    },
    (payload) => {
      // Add new message to state
    }
  )
  .subscribe();
```

### Presence Tracking

```typescript
const channel = supabase.channel(`presence-${leagueId}`)
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    // Update online users count
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: userId, email: userEmail });
    }
  });
```

### JeffBot System Prompt

```text
You are JeffBot, a friendly Survivor superfan assistant. You know everything 
about Survivor history, past seasons, challenges, player stats, and trivia. 
You speak casually with occasional Jeff Probst catchphrases like "Come on in!" 
or "The tribe has spoken."

CRITICAL RULE: You must NEVER reveal any information about Season [CURRENT_SEASON] 
including cast, boot order, challenges, advantages, or winner. If asked about the 
current season, say something like "No spoilers! You'll have to watch and find out. 
The tribe has spoken... but I haven't!"

Keep responses brief (2-3 sentences max) since this is a chat.
```

### Message Character Limit

- Frontend enforces 500 character max
- Shows character count when approaching limit
- Send button disabled at 0 or >500 characters

### Rate Limiting Implementation

```typescript
const [canSend, setCanSend] = useState(true);

const sendMessage = async (content: string) => {
  if (!canSend) return;
  
  setCanSend(false);
  // Send message...
  
  setTimeout(() => setCanSend(true), 2000);
};
```

## Security Considerations

- RLS ensures users can only access chat in their own leagues
- Uses existing `is_league_member` helper function for policies
- JeffBot function uses service role key to insert bot messages
- User messages require valid auth token

## User Experience

1. User opens league dashboard, sees chat button in bottom-right
2. Clicks to expand chat panel
3. Sees recent messages from league members
4. Types message, clicks send (or presses Enter)
5. Message appears instantly for all online users
6. Types "@jeffbot who won season 40?" and sends
7. Sees typing indicator, then JeffBot's response appears
8. Can react to any message with quick emoji buttons
9. Minimizes chat, badge shows unread count

