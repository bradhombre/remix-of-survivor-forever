
# Enable Live Updates for Draft Page

## Problem
The draft page requires a manual refresh to see new picks because the database tables aren't configured for realtime updates. The frontend code already listens for changes (realtime subscriptions exist in the game state hook), but the database isn't broadcasting those changes.

## Solution
Add the relevant game tables to the realtime publication so the existing subscription code starts working. This is a single database migration -- no frontend code changes needed.

## Tables to Enable
- `game_sessions` -- draft index changes, episode updates
- `contestants` -- new picks, eliminations
- `draft_order` -- order changes
- `scoring_events` -- score updates
- `crying_contestants` -- crying tracking
- `player_profiles` -- avatar updates

## Technical Details

A single SQL migration will run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contestants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_order;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scoring_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crying_contestants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_profiles;
```

No frontend changes are needed -- the realtime listeners in `useGameStateDB.ts` are already wired up and will start receiving events once the tables are published.
