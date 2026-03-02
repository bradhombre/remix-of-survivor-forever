

## Abandoned League Management & League Detail View

### Overview
Build a comprehensive league management system for the Admin panel with three layers: activity tracking, deeper league visibility, and cleanup tools.

### 1. Database: Add `last_activity_at` column to leagues

Add a `last_activity_at` timestamp column to the `leagues` table that auto-updates whenever meaningful activity occurs (chat messages, scoring events, game session updates).

**Migration:**
- Add `last_activity_at` column (defaults to `created_at`) to `leagues`
- Create a trigger function `update_league_activity()` that sets `last_activity_at = now()` on the parent league
- Attach triggers to `chat_messages` (on INSERT), `scoring_events` (on INSERT), and `game_sessions` (on UPDATE of `mode` or `episode`) that call this function
- Backfill existing leagues: set `last_activity_at` to the most recent activity timestamp (latest chat message, scoring event, or session update)

### 2. Enhanced Admin Leagues Table

Upgrade the leagues table in the Admin panel to show richer data per league:

- **New columns:** Game Mode (setup/draft/game), Season, Episode, Draft progress (e.g. "12/16 picked"), Last Activity (relative time like "3 weeks ago"), Status badge (Active / Inactive / Abandoned)
- **Status logic:** Active = activity within 14 days, Inactive = 14-30 days, Abandoned = 30+ days
- **Filters:** Add filter buttons (All / Active / Inactive / Abandoned) and a search box for league name
- **Sorting:** Clickable column headers, default sort by last activity
- **Bulk actions:** Checkbox selection with a "Delete Selected" button

### 3. League Detail Drawer

When clicking "View" on a league, instead of navigating away, open a slide-out drawer/sheet showing:

- League name, owner, invite code, created date
- Current game state: mode, season, episode, draft type
- Member list with their team names and roles
- Contestant draft status (who's picked, who's available)
- Recent chat messages (last 10)
- Scoring summary (total events count)

This gives you a full picture without leaving the admin panel.

### 4. Owner Cleanup Reminders (Future-Ready)

Add an `is_inactive_notified` boolean column to `leagues` so that a future scheduled function can email owners of inactive leagues. For now, this column is just a flag -- the actual email sending can be wired up later when needed.

### Technical Details

**Files to create:**
- `src/components/admin/LeagueManager.tsx` -- new component replacing the inline leagues tab content, with filters, search, bulk delete, and the enhanced table
- `src/components/admin/LeagueDetailSheet.tsx` -- slide-out drawer showing deep league info

**Files to modify:**
- `src/pages/Admin.tsx` -- replace inline leagues content with `<LeagueManager />`, remove league-specific state/logic from this file
- Database migration for `last_activity_at` column, triggers, and backfill

**Key data fetching in LeagueManager:**
- Fetch leagues with game_sessions joined (mode, season, episode)
- Fetch contestant counts per session for draft progress
- Use the new `last_activity_at` for activity status
- All filtering/sorting done client-side for simplicity

**Key data fetching in LeagueDetailSheet:**
- Fetch game_session, league_teams with profiles, contestants, recent chat_messages, and scoring_events count for the selected league
