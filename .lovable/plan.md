# Ideas 3 and 4: Commissioner Checklist + New Player Welcome Tour

## Overview

Two client-side components that guide users through their first experience in a league. The tour will include gameplay explanations (like Final Tribal Vote predictions) so players understand what to expect after the draft.

---

## Idea 3: Commissioner Checklist

A dismissible card shown at the top of the Play tab for league admins when the league is still in setup mode.

### Checklist Steps

1. **Add your cast** -- links to Admin tab; complete when `contestants.length > 0`
2. **Invite players** -- links to League tab; complete when more than 1 team has a user assigned
3. **Customize scoring** -- links to Admin tab (Scoring sub-tab); always shown as actionable (no reliable way to detect if defaults were changed)
4. **Start the draft** -- links to Admin tab; complete when `mode !== "setup"`

### Behavior

- Only visible when `isLeagueAdmin && state.mode === "setup"`
- Dismissible via an X button; saved to `localStorage` as `checklist-dismissed-{leagueId}`
- When all steps complete, shows a "You're all set!" state with a dismiss button
- Clicking a step switches `viewMode` to the relevant tab

---

## Idea 4: New Player Welcome Tour

A step-by-step tooltip walkthrough that highlights key UI areas on first visit to a league. Includes gameplay explanations so players understand features they'll encounter later.

### Tour Steps (All Players)

1. **Play tab** -- "This is where your fantasy game lives. During the draft, you'll pick Survivor contestants for your team. Once the game starts, your commissioner scores events each episode."
2. **League tab** -- "See who's in your league, customize your team name and avatar, and share the invite code with friends."
3. **Chat bubble** -- "Chat with your league mates and ask @jeffbot any Survivor question -- trivia, strategy, history."

### Additional Step (Commissioner Only)

4. **Admin tab** -- "Manage your cast, scoring settings, and league configuration. You'll use this to score events during each episode."

### Post-Draft Gameplay Tips (shown separately)

When the game mode first loads (after the draft completes), show a one-time informational card/banner explaining key gameplay concepts:

- **Leaderboard** -- Your team earns points when your contestants do things in the show (find idols, win immunity, survive rounds, etc.)
- **Final Tribal Vote** -- If you're live watching with your friends, near the end of the episode, you can pause and predict who gets voted out. Correct guesses earn bonus points -- unless everyone picks the same person!
- **Post-Merge toggle** -- Once the merge happens, your commissioner toggles this on, which increases survival points per round.
- **Scoring events** -- Commissioners and players (depending on settings) tap on a contestant to score actions like "Find Idol", "Win Immunity", "Cry", and more.

This card is dismissible and tracked via `localStorage` as `game-tips-seen-{leagueId}`.

---

## Technical Details

### New Files

1. `**src/components/CommissionerChecklist.tsx**`
  - Props: `leagueId`, `contestantCount`, `teamCount` (teams with users), `mode`, `onNavigate` (callback accepting a `ViewMode`)
  - Uses `localStorage` for dismissal
  - Built with existing `Card`, `Badge`, `Button`, and `CheckCircle`/`Circle` icons
2. `**src/components/OnboardingTour.tsx**`
  - Props: `leagueId`, `isLeagueAdmin`
  - State machine with step index, uses `document.querySelector('[data-tour="..."]')` to find anchor elements
  - Renders a portal with a semi-transparent backdrop and a positioned popover near the target
  - Uses `getBoundingClientRect()` for positioning, recalculates on resize
  - "Next", "Back", and "Skip tour" controls
  - Saves `tour-seen-{leagueId}` to `localStorage` on completion or skip
3. `**src/components/GameplayTips.tsx**`
  - Dismissible card shown at top of the game view on first load after draft
  - Explains leaderboard, final tribal vote, post-merge, and scoring actions
  - Tracks `game-tips-seen-{leagueId}` in `localStorage`

### Modified Files

4. `**src/pages/LeagueDashboard.tsx**`
  - Add `data-tour` attributes to Play, History, League, and Admin nav buttons
  - Import and render `CommissionerChecklist` conditionally (admin + setup mode + not dismissed)
  - Import and render `OnboardingTour` conditionally (first visit)
  - Import and render `GameplayTips` inside the Play tab when `canShowGame` is true
5. `**src/components/LeagueChat.tsx**`
  - Add `data-tour="chat"` to the collapsed FAB button

### No Backend Changes

All three features are purely client-side using `localStorage` for persistence.