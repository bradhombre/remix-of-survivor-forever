

## Add "Visit League" Button to Admin Panel

### What it does
Adds a link from the admin League Manager table to directly open any league's full dashboard (`/league/:id`), letting you drop in and see exactly what league members see -- live game, draft, scores, etc.

### Changes

#### 1. LeagueManager.tsx -- Add "Visit" link
Add a navigation link (opens in new tab) next to the existing "View" button on each league row. This takes you to the full LeagueDashboard for that league.

#### 2. LeagueDetailSheet.tsx -- Add "Visit" link
Add a "Visit League" button at the top of the detail drawer so you can also jump to the live dashboard from the detail view.

### Why this works without other changes
- Your super_admin role already grants SELECT access on `game_sessions`, `contestants`, `scoring_events`, `draft_order`, and other tables via RLS policies that check `is_super_admin(auth.uid())`
- The `useLeagueRole` hook already recognizes `super_admin` and grants `isLeagueAdmin = true`
- No membership record is needed -- super_admin bypasses league membership checks

### Files to modify
- `src/components/admin/LeagueManager.tsx` -- add "Visit" button/link per row
- `src/components/admin/LeagueDetailSheet.tsx` -- add "Visit League" button in drawer

