

# Fix Chat Sender Names and JeffBot Knowledge Issues

## Issues Identified

### Issue 1: Chat Not Showing Sender Names
**Root Cause**: The `profiles` table is empty. Although there is a `handle_new_user()` function that should insert into `profiles` when a user signs up, the trigger binding this function to the `auth.users` table was never created in the migrations. The user `admin@test.com` exists in `auth.users` but has no corresponding row in `profiles`.

**Evidence**: 
- Query `SELECT * FROM profiles` returns `[]` (empty)
- Query `SELECT * FROM auth.users` returns `admin@test.com` user
- RLS policy "League members can view co-member profiles" is working, but there's no data to return

### Issue 2: JeffBot Doesn't Know Season 48 Winner
**Root Cause**: The AI model (Gemini) has a knowledge cutoff date. The current date is January 2026, but Season 48 may be beyond the model's training data. JeffBot responded: *"Season 48 hasn't actually aired yet..."* which is the model's best guess based on its knowledge.

**Note**: This is a fundamental AI model limitation, not a bug. We can improve the prompt to clarify that any season with a number lower than the current season is definitely a past season and should be answered.

## Solution

### Part 1: Fix Empty Profiles Table

1. **Create trigger on auth.users** - Add a database trigger that fires the `handle_new_user()` function when new users are inserted into `auth.users`

2. **Backfill existing users** - Insert profile records for any existing users in `auth.users` that don't have corresponding `profiles` entries

### Part 2: Improve JeffBot Knowledge Handling

1. **Update the system prompt** - Clarify that all seasons with numbers less than the current season are definitely past seasons and JeffBot should answer questions about them

2. **Add season context** - Tell the AI model the current date/year to help it reason about which seasons have aired

## Database Migration

```sql
-- Create trigger on auth.users to create profiles automatically
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users who don't have one
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

## Edge Function Update

Update `supabase/functions/jeffbot/index.ts` system prompt:

```text
You are JeffBot, a friendly Survivor superfan assistant...

IMPORTANT CONTEXT:
- The current season is Season {currentSeason}
- All seasons numbered LESS than {currentSeason} are past seasons you CAN discuss
- You must NEVER reveal information about Season {currentSeason} (the current season)

For example: If current season is 49, you CAN answer about seasons 1-48.
```

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Create trigger, backfill profiles |
| `supabase/functions/jeffbot/index.ts` | Update system prompt with clearer past/current season logic |

## Expected Outcome

After these changes:
- New users will automatically get profile records created
- Existing users will have their profiles backfilled
- Chat messages will show sender emails instead of "Unknown"
- JeffBot will correctly answer questions about past seasons (1-48) while still protecting current season (49) spoilers

