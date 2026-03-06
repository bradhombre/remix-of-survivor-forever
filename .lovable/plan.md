

## Cross-League Chat Monitor for Super Admins

### What it does
Adds a new "Chat" tab to the Platform Admin panel that shows recent chat activity across all leagues in one view. This gives you a single place to monitor conversations, spot issues, and see how leagues are engaging with the chat and JeffBot.

### Features
- **Cross-league chat feed**: Most recent messages across all leagues, grouped or labeled by league name
- **League filter dropdown**: Optionally filter to a specific league
- **Message stats**: Quick counts of total messages, JeffBot interactions, and active chatting leagues
- **Full message view**: Shows sender (team name or email), content, timestamp, and league name
- **Load more**: Paginated with a "load more" button (starts with 50 messages)

### Technical changes

**`src/pages/Admin.tsx`**
- Add a new "Chat" tab with a `MessageSquare` icon to the TabsList
- Render the new `ChatMonitor` component inside that tab

**`src/components/admin/ChatMonitor.tsx`** (new file)
- Fetches recent `chat_messages` across all leagues (ordered by `created_at` desc, paginated at 50)
- Joins with `profiles` for sender emails and `leagues` for league names, `league_teams` for team names
- Displays each message with: league name badge, sender name, timestamp, content (truncated with expand)
- Filter dropdown populated from leagues with chat activity
- Summary stats card at top: total messages (all time), messages today, JeffBot messages, active leagues
- Uses existing RLS — super admin SELECT is already covered by `is_league_member` check combined with `is_super_admin` in the chat_messages policies... actually, let me check.

**RLS consideration**: The `chat_messages` SELECT policy uses `is_league_member(auth.uid(), league_id)` which does NOT include super admin bypass. A new policy is needed:

**Database migration**: Add a SELECT policy on `chat_messages` for super admins:
```sql
CREATE POLICY "Super admins can view all chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));
```

### UI layout
The chat monitor will be a card with:
1. Stats row at top (total messages, today's count, JeffBot %, active leagues)
2. League filter dropdown
3. Scrollable message list with league labels, sender names, timestamps, and content

