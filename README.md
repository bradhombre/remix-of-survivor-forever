# Survivors Ready

Survivor fantasy league app. Friends create a league, draft castaways, and score each episode. Live at **https://survivorsready.com**.

## Where things live

| Thing | Where |
|---|---|
| Hosting, database, login, backend functions | Lovable (Lovable Cloud / Supabase), project "remix-of-survivor-forever" |
| Code | This GitHub repo (`bradhombre`), two-way synced with Lovable |
| Local copy | `Documents/COWORK - PERSONAL/Survivors Ready/remix-of-survivor-forever` |
| Email + tracking | Customer.io workspace "Survivors Ready" (snippet in `index.html`) |
| Platform admin screens | survivorsready.com/admin (Cast, News, Chat, Bugs, Settings) |

## How a change goes live

1. Claude (or you) edit files here.
2. **GitHub Desktop**: Commit to main, then Push origin.
3. **Lovable**: wait for Project settings → Git to show "In sync", then **Publish → Update**.

Pushing alone does **not** change the live site.

## The gotchas

- **Database changes and backend functions don't deploy from GitHub.** New files in `supabase/migrations/` or changes in `supabase/functions/` need a prompt in Lovable's chat, for example: "Apply the migration in supabase/migrations/<file>.sql" or "Deploy the jeffbot edge function."
- **If you edit in Lovable, pull first.** Before asking Claude for changes, click Fetch origin, then Pull, in GitHub Desktop so the two copies don't diverge.
- **The repo has no data.** Leagues, scores and cast live in the database, not in these files.

## New season checklist

1. /admin → Settings → set **Current season** (e.g. 52).
2. /admin → Cast → **Import cast from wiki** for that season, then check the photos.
3. Each commissioner sees a "Season N is here" banner in their league and clicks **Start Season N**. The old season is saved to History; teams and scoring carry over.
4. In the league, go to the Draft tab, click **Import Season N cast**, and draft.

## Tech

React + Vite + TypeScript + Tailwind/shadcn. Backend is Supabase (Postgres + row-level security + Deno edge functions in `supabase/functions`). Main game logic is in `src/hooks/useGameStateDB.ts`; scoring rules are in `src/lib/scoring.ts`.
