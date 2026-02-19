

# Phase 14: Winner-Take-All Mode

## Overview
Add a new "Winner Takes All" game type alongside the existing "Full Fantasy" mode. In Winner Takes All, each player drafts just one contestant as their Sole Survivor prediction. No scoring -- just elimination tracking until one contestant remains and their drafter wins.

---

## 14.1: Database -- Add `game_type` Column

**Migration:**
- Add `game_type` column to `game_sessions` table: `text NOT NULL DEFAULT 'full'` with a CHECK constraint allowing `'full'` or `'winner_takes_all'`.

**CreateLeagueDialog changes (`src/components/CreateLeagueDialog.tsx`):**
- After the league name input (Step 1), add a game type selector using two radio cards: "Full Fantasy" and "Winner Takes All" with descriptions.
- Pass the selected `game_type` to the `create_league` RPC or update the game session after creation.
- Since `create_league` RPC defaults to `'full'`, after league creation, if `winner_takes_all` is selected, update the game session's `game_type`.

**Type updates (`src/types/survivor.ts`):**
- Add `GameType = "full" | "winner_takes_all"` type.
- Add `gameType` to `GameState`.

**Hook updates (`src/hooks/useGameStateDB.ts`):**
- Load `game_type` from the session and expose it in state.
- Add `setGameType` function (only callable before draft begins).

---

## 14.2: Winner Takes All Draft

**DraftMode (`src/components/DraftMode.tsx`):**
- Accept `gameType` prop.
- When `gameType === 'winner_takes_all'`:
  - Change header to "Pick your Sole Survivor prediction".
  - Set `picksPerTeam = 1` instead of 4.
  - Hide round tracking.
  - Draft ends when each player has picked once.

**useGameStateDB (`src/hooks/useGameStateDB.ts`):**
- In `draftContestant`, use `picksPerTeam = gameType === 'winner_takes_all' ? 1 : 4`.

**LeagueDashboard (`src/pages/LeagueDashboard.tsx`):**
- Update `canShowGame` logic: for winner_takes_all, draft is complete when `currentDraftIndex >= teamCount` (1 pick each) instead of `>= 16`.
- Update `handleStartGame` similarly.

---

## 14.3: Winner Takes All Game View

**New component: `src/components/WinnerTakesAllMode.tsx`**
- Simple grid showing each player's picked contestant with photo.
- Eliminated contestants shown with strikethrough/faded style.
- League admin gets a toggle button to mark contestants as eliminated.
- No scoring section, no episode tracking.

**LeagueDashboard:**
- When `gameType === 'winner_takes_all'` and game is active, render `WinnerTakesAllMode` instead of `GameMode`.

---

## 14.4: Crown Sole Survivor

**WinnerTakesAllMode:**
- Add "Crown Sole Survivor" button for league admins.
  - Shows when only 1 non-eliminated contestant remains, or allows manual selection from remaining.
  - On click, marks the contestant as winner (using a scoring event or a new field -- we'll use `is_eliminated = false` and a special "winner" flag via a scoring event with action `WIN_SURVIVOR`).
  - Sets `session.status = 'completed'`.
- Display celebration state: winner's name, photo, and which player drafted them with a trophy badge.

---

## 14.5: League Type Indicator

**Leagues page (`src/pages/Leagues.tsx`):**
- Fetch `game_type` from the game session for each league.
- Show a subtle badge: "Full Fantasy" or "Winner Takes All" on each league card.

**LeagueDashboard header:**
- Show game type badge next to the league name in the breadcrumb area.

---

## Technical Summary

| Area | Files Modified |
|------|---------------|
| Database | 1 migration (add `game_type` column) |
| Types | `src/types/survivor.ts` |
| Hook | `src/hooks/useGameStateDB.ts` |
| Create flow | `src/components/CreateLeagueDialog.tsx` |
| Draft | `src/components/DraftMode.tsx` |
| Game view | New `src/components/WinnerTakesAllMode.tsx` |
| Dashboard | `src/pages/LeagueDashboard.tsx` |
| League list | `src/pages/Leagues.tsx` |

