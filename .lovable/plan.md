

# Post Fix Notification to Affected League Chats

## What We're Doing

Inserting a friendly JeffBot announcement into the chat of every league that had mismatched contestant owners due to the team rename bug. The message will inform league members that the issue has been fixed and provide instructions on how to correct any remaining errors using the built-in Contestant Management tool.

## Message Content

A JeffBot-style message like:

> Hey everyone! We fixed a bug where renaming your team could cause your players to show as "0/4 active" and stop earning points. Your team's contestants should now be properly linked to your current team name.
>
> If you notice any contestants still assigned to the wrong team, your league commissioner can fix it: go to the Admin Panel (gear icon) -> Data tab -> Contestant Management, then click the edit button next to any contestant to reassign them to the correct team.
>
> Sorry for the inconvenience, and thanks for your patience!

## Technical Steps

### 1. Database migration to insert chat messages

Run a single INSERT statement that posts the JeffBot message into all affected leagues' chats. The message will:

- Use `is_bot = true` so it renders as a JeffBot message
- Use the league's `owner_id` as the `user_id` (required by the table schema)
- Target only the leagues identified with mismatched contestant data (~45 leagues)

```sql
INSERT INTO chat_messages (league_id, user_id, content, is_bot)
SELECT DISTINCT gs.league_id, l.owner_id,
  E'Hey everyone! \U0001F527 We fixed a bug where renaming your team could cause your players to show as "0/4 active" and stop earning points. Your team''s contestants should now be properly linked to your current team name.\n\nIf you notice any contestants still assigned to the wrong team, your league commissioner can fix it: open the Admin Panel (gear icon) \u2192 Data tab \u2192 Contestant Management, then click the edit button next to any contestant to reassign them to the correct team.\n\nSorry for the inconvenience!',
  true
FROM contestants c
JOIN game_sessions gs ON c.session_id = gs.id
JOIN leagues l ON gs.league_id = l.id
WHERE c.owner IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM draft_order d
    WHERE d.session_id = c.session_id
      AND d.player_name = c.owner
  );
```

### 2. No code changes needed

The existing chat system will display these messages automatically as JeffBot messages via the real-time subscription. No frontend changes are required.

## Summary

| Change | Detail |
|--------|--------|
| Database migration | Insert JeffBot notification into ~45 affected league chats |
| Code changes | None |

