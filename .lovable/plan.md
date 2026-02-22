
# Add Bug Submission Method

## Overview
Add a "Report a Bug" option to the existing dropdown menu on the Leagues page. Clicking it opens a dialog where users can describe the bug and submit it. Reports get saved to a new `bug_reports` database table.

## Changes

### 1. Create `bug_reports` database table
A new table to store submissions:
- `id` (uuid, primary key)
- `user_id` (uuid, not null)
- `description` (text, not null)
- `page_url` (text, nullable -- captures where the user was)
- `status` (text, default 'open')
- `created_at` (timestamptz, default now())

RLS policies:
- Users can INSERT their own reports (`auth.uid() = user_id`)
- Users can SELECT their own reports
- Super admins can SELECT all reports

### 2. Create `BugReportDialog` component (`src/components/BugReportDialog.tsx`)
A simple dialog with:
- A textarea for the bug description (required, max 2000 chars)
- A submit button that inserts into `bug_reports`
- Success/error toast feedback
- Auto-captures current page URL

### 3. Add "Report a Bug" to the dropdown menu (`src/pages/Leagues.tsx`)
Add a new menu item (with a Bug icon) between "Sign Out" and "Delete Account":
```
Sign Out
Report a Bug
-----------
Delete Account
```

### 4. Add a bug reports viewer to the Admin page (`src/pages/Admin.tsx`)
Add a new "Bugs" tab so super admins can see submitted reports with user email, description, date, and status.

## Technical Details

### Database migration
```sql
CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  page_url text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own bug reports"
  ON public.bug_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bug reports"
  ON public.bug_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all bug reports"
  ON public.bug_reports FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update bug reports"
  ON public.bug_reports FOR UPDATE
  USING (is_super_admin(auth.uid()));
```

### Files changed

| File | Change |
|------|--------|
| Database migration | New `bug_reports` table with RLS |
| `src/components/BugReportDialog.tsx` | New dialog component with textarea form |
| `src/pages/Leagues.tsx` | Add "Report a Bug" menu item + dialog state |
| `src/pages/Admin.tsx` | Add "Bugs" tab to view/manage submissions |
