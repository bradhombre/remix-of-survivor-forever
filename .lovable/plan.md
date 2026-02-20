

# Update JeffBot Welcome Message

## What Changes

Update the database trigger function `seed_jeffbot_welcome` to include a mention of general league chat alongside JeffBot functionality. The new message will read something like:

> "Hey! I'm JeffBot, your Survivor encyclopedia. Tag me with @jeffbot followed by any question -- trivia, strategy, history, you name it.
>
> This is also your league's group chat -- trash talk, strategize, and discuss episodes with your league mates!
>
> Try asking: 'Who has the most individual immunity wins?'"

## Technical Details

- Single database migration using `CREATE OR REPLACE FUNCTION` on `public.seed_jeffbot_welcome()` to update the message content
- No code file changes needed -- the trigger and function already exist, just the message text changes
- Existing leagues won't be affected (trigger only fires on new league creation)

