
# Phase 9: Season Renewal & Phase 10: News Feed Implementation

## Overview
This plan implements two major feature phases:
1. **Season Renewal (Phase 9)**: Adds season status tracking, a completion banner, and a season selector in the History tab
2. **News Feed (Phase 10)**: Creates a platform-wide news system with spoiler protection and expiration dates

---

## Phase 9: Season Renewal

### 9.1: Season Status Tracking

**Database Changes**

| Table | Column | Type | Default |
|-------|--------|------|---------|
| `game_sessions` | `status` | text | `'active'` |
| `leagues` | `auto_renew` | boolean | `true` |

**Migration SQL:**
```sql
-- Add status column to game_sessions
ALTER TABLE public.game_sessions 
ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Add auto_renew column to leagues
ALTER TABLE public.leagues 
ADD COLUMN auto_renew boolean NOT NULL DEFAULT true;
```

**Code Changes:**
- Update `src/hooks/useGameStateDB.ts`: 
  - Modify `resetState()` function to set `status = 'completed'` on the current session when archiving
  - Load and expose `status` field from game_sessions

---

### 9.2: New Season Banner

**New Component:** `src/components/SeasonCompleteBanner.tsx`

A banner that appears when the current game_session has `status = 'completed'`:
- Shows message: "Season Complete! Ready for the next one?"
- "Start New Season" button (only visible/clickable for league admins)
- Clicking creates a NEW `game_session` in 'setup' mode for the same league
- Preserves league members and `scoring_config`
- Resets contestants, draft order, scores (fresh session)
- Banner hides automatically once a new active session exists

**Integration Points:**
- Add banner to `src/pages/LeagueDashboard.tsx` above main content
- Use `isLeagueAdmin` to control button visibility
- Modify `useGameStateDB` to expose session status and add `startNewSeason()` function

```text
Visual Layout:
+------------------------------------------------------------+
|  Season 49 Complete! Ready for the next one?  [Start New]  |
+------------------------------------------------------------+
|                      Main Dashboard                         |
```

---

### 9.3: Season Selector in History Tab

**Changes to:** `src/components/HistoryMode.tsx`

| Current Behavior | New Behavior |
|------------------|--------------|
| Shows archived_seasons from JSONB | Query all completed game_sessions for this league |
| List view of seasons | Dropdown selector at top |
| Fixed data structure | Each shows season number, completion date, winner |

**Implementation:**
- Add new prop: `leagueId` to HistoryMode
- Query `game_sessions` where `league_id = leagueId AND status = 'completed'`
- Join with `archived_seasons` for final standings data
- Add `Select` dropdown to choose which season to view
- Default to most recently completed season

---

## Phase 10: News Feed

### 10.1: News Table

**Database Migration:**

```sql
CREATE TABLE public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_spoiler boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL
);

-- Enable RLS
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read non-spoiler, non-expired posts
CREATE POLICY "Users can read non-spoiler active posts"
ON public.news_posts
FOR SELECT
TO authenticated
USING (
  is_spoiler = false 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Super admins can do everything
CREATE POLICY "Super admins have full access"
ON public.news_posts
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));
```

---

### 10.2: News Display on League Dashboard

**New Component:** `src/components/NewsFeed.tsx`

Collapsible section above main dashboard content:
- Query 3 most recent non-expired, non-spoiler posts
- Shows title and published date in collapsed view
- Click to expand and show full content (inline accordion or modal)
- Hides entirely if no posts exist

**Integration:**
- Add to `src/pages/LeagueDashboard.tsx` above mode tabs
- Use Radix Collapsible or Accordion component
- Graceful loading state

```text
+------------------------------------------------------------+
|  v News (3 updates)                              [Collapse] |
|    - Season 50 Casting Announced! - Jan 28                  |
|    - Merge Episode Reminder - Jan 25                        |
|    - Rule Update: Idol Points Changed - Jan 20              |
+------------------------------------------------------------+
|                      Main Dashboard                         |
```

---

### 10.3: News Admin Panel

**Changes to:** `src/pages/Admin.tsx`

Add a "News" tab to the platform admin panel:

| Feature | Description |
|---------|-------------|
| Posts Table | Title, published date, spoiler flag, expiration date |
| New Post Button | Opens form dialog |
| Form Fields | Title (required), Content (textarea), Is Spoiler (checkbox), Expires At (date picker) |
| Edit/Delete | Inline actions for each post |

**Implementation:**
- Add `Tabs` component with "Leagues" and "News" tabs
- Create `src/components/admin/NewsManager.tsx` component
- Form uses existing Dialog, Input, Textarea, Checkbox, and date picker components
- All operations restricted to super_admin via RLS

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| **Database Migration** | Create | Add status to game_sessions, auto_renew to leagues, create news_posts table |
| `src/integrations/supabase/types.ts` | Auto-update | Will reflect new columns and table |
| `src/hooks/useGameStateDB.ts` | Modify | Add status field, startNewSeason function |
| `src/components/SeasonCompleteBanner.tsx` | Create | New season banner component |
| `src/components/NewsFeed.tsx` | Create | Collapsible news section |
| `src/components/admin/NewsManager.tsx` | Create | News CRUD management |
| `src/pages/LeagueDashboard.tsx` | Modify | Add SeasonCompleteBanner and NewsFeed |
| `src/components/HistoryMode.tsx` | Modify | Add season selector dropdown, accept leagueId prop |
| `src/pages/Admin.tsx` | Modify | Add News tab with NewsManager |

---

## Technical Details

### Season Transition Flow

```text
1. Admin clicks "Start New Season" in banner
2. System archives current session data to archived_seasons
3. Current session status updated to 'completed'
4. New game_session created with:
   - league_id: same league
   - mode: 'setup'
   - season: current + 1
   - status: 'active'
5. League scoring_config preserved
6. Members preserved (no changes to league_teams)
7. Banner disappears, UI shows new session in setup mode
```

### News Post Security

- `author_id` references auth.users for audit trail
- RLS ensures only super_admins can create/edit/delete
- Spoiler posts hidden from regular users (separate admin view)
- Expired posts automatically hidden via RLS using `expires_at > now()`

### Backward Compatibility

- Existing game_sessions default to status='active'
- Existing leagues default to auto_renew=true
- Current archive flow continues to work
- History tab gracefully handles both old archived_seasons data and new completed sessions
