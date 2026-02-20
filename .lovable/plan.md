

# Add Customer.io Tracking Integration

## Overview

Integrate Customer.io's JavaScript tracking into the app using Site ID `87d8fe6f98e8d1f436f8`. This adds user identification on auth events, activity tracking, and custom event tracking at key moments.

---

## Changes

### 1. Add Customer.io snippet to `index.html`
Add the standard Customer.io JavaScript tracking snippet inside `<head>` with the Site ID `87d8fe6f98e8d1f436f8`.

### 2. Create tracking utility module
**New file: `src/lib/customerio.ts`**

A thin wrapper around the global `_cio` object providing:
- `identifyUser(id, email, createdAt, extras?)` -- calls `_cio.identify()` with id, email, created_at (Unix), last_active_at
- `trackEvent(name, properties?)` -- calls `_cio.track()`
- `updateLastActive(id)` -- lightweight identify call updating only `last_active_at`
- All functions gracefully no-op if `_cio` is not loaded

### 3. Identify users and track sign-up
**File: `src/hooks/useAuth.ts`**

- In the `onAuthStateChange` listener, when a session is present, call `identifyUser()` with the user's id, email, and `created_at`
- In the `signUp` function, after a successful call (no error), fire `trackEvent('user_signed_up')`

### 4. Track `last_active_at` on meaningful actions
- **`src/pages/LeagueDashboard.tsx`** -- call `updateLastActive()` on dashboard mount (viewing standings)
- **`src/components/DraftMode.tsx`** -- call `updateLastActive()` when `onDraftContestant` is invoked
- **`src/components/GameMode.tsx`** -- call `updateLastActive()` when a scoring event is added

### 5. Set `has_active_league: true` on league create/join
- **`src/components/CreateLeagueDialog.tsx`** -- after successful league creation, call `identifyUser()` with `has_active_league: true`
- **`src/components/JoinLeagueDialog.tsx`** -- after successful join, call `identifyUser()` with `has_active_league: true`

### 6. Track `league_invite_sent`
- **`src/components/LeagueInfo.tsx`** -- in `handleCopyInviteLink()` and `handleCopyInviteCode()`, fire `trackEvent('league_invite_sent', { league_name, invite_url })`
- **`src/components/SetupMode.tsx`** -- in `copyInviteLink()`, fire the same event

### 7. Track `draft_started`
**File: `src/pages/LeagueDashboard.tsx`**

In `handleStartDraft()`, after calling `setMode("draft")`, fire `trackEvent('draft_started', { league_name, draft_time })`.

### 8. Track `season_ended`
**File: `src/hooks/useGameStateDB.ts`**

In `resetState()`, after the archive insert succeeds, fire `trackEvent('season_ended', { league_name, winner_name, season, total_rounds })`. The winner comes from the top of the computed leaderboard; total_rounds is the current episode number.

---

## Technical Details

### New Files
- `src/lib/customerio.ts` (~40 lines)

### Modified Files
| File | Change |
|------|--------|
| `index.html` | Add CIO snippet in `<head>` |
| `src/hooks/useAuth.ts` | `identifyUser` on auth change, `trackEvent('user_signed_up')` on signup |
| `src/pages/LeagueDashboard.tsx` | `updateLastActive` on mount, `trackEvent('draft_started')` in `handleStartDraft` |
| `src/components/DraftMode.tsx` | `updateLastActive` on pick |
| `src/components/GameMode.tsx` | `updateLastActive` on scoring |
| `src/components/CreateLeagueDialog.tsx` | `identifyUser` with `has_active_league` |
| `src/components/JoinLeagueDialog.tsx` | `identifyUser` with `has_active_league` |
| `src/components/LeagueInfo.tsx` | `trackEvent('league_invite_sent')` on copy |
| `src/components/SetupMode.tsx` | `trackEvent('league_invite_sent')` on copy |
| `src/hooks/useGameStateDB.ts` | `trackEvent('season_ended')` in `resetState` |

### No backend or database changes required
All tracking is purely client-side via the Customer.io JavaScript SDK.

