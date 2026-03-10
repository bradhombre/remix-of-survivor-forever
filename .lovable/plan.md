

## Enhance JeffBot with App Help Knowledge + Announce New Feature

### What changes

**1. JeffBot system prompt** (`supabase/functions/jeffbot/index.ts`)
Add an `APP HELP` section to the system prompt covering the specific scoring questions users are asking:

- **How to score an episode**: Scroll down to "Score This Episode" section on the Game tab. Each contestant card has quick-action buttons (Survive, Immunity, Cry, Voted Out). Tap "More" to expand all scoring categories. Commissioners can also mark eliminations.
- **How to mark all survivors at once**: Commissioners tap the "..." menu (mobile) or "Mark Survivors" button (desktop) to bulk-award survival points to all remaining contestants for the current episode.
- **How to undo scoring**: Use the "Undo Last Action" button — on mobile it's in the "..." admin menu, on desktop it's the undo icon button. This removes the most recent scoring event.
- **How the Tribal button works**: Opens predictions — each player picks who they think gets voted out. Correct guessers earn bonus points (unless everyone picks the same person). Commissioners use this to officially eliminate contestants.
- **How to find more scoring categories**: Tap "More" on any contestant card to see all enabled categories. Commissioners can customize which categories are available and their point values in the Scoring tab under league settings.
- **General app help**: How to invite players (share invite code/link), how the draft works, how to claim/rename teams, how to resize the league.

The prompt will instruct JeffBot to answer app questions concisely and suggest submitting a bug report if it doesn't know the answer.

**2. Update welcome message** (DB migration to replace `seed_jeffbot_welcome` function)
Change the welcome text to mention app help: add "Ask me questions about the app!" to the existing intro.

**3. Announce new feature to all existing leagues** (DB migration)
Insert a bot message into every league's chat announcing the new capability:
```sql
INSERT INTO chat_messages (league_id, user_id, content, is_bot)
SELECT l.id, l.owner_id,
  'New feature! 🎉 I can now answer questions about how to use the app — scoring, drafts, inviting players, you name it. Just tag me with @jeffbot and ask away!',
  true
FROM leagues l;
```

### Technical detail
- Edge function: expand the `systemPrompt` string in `supabase/functions/jeffbot/index.ts` with an `APP HELP` block (~20 lines of Q&A knowledge)
- DB migration #1: `CREATE OR REPLACE FUNCTION seed_jeffbot_welcome()` with updated welcome text mentioning app help
- DB migration #2: One-time INSERT of announcement message to all leagues using each league's `owner_id`
- No schema changes, no new files, no RLS changes needed

