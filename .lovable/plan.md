

# Improvement Ideas: Chat Discoverability, Onboarding, and Help Tools

## Problem Summary
1. **JeffBot is invisible** -- Users don't know it exists. The only hint is a tiny placeholder ("Message or @jeffbot question...") that's easy to miss.
2. **No onboarding guidance** -- New players and commissioners land in the dashboard cold, with no explanation of how things work.
3. **Chat UX could be richer** -- The chat widget works well mechanically but could surface more value.

---

## Idea 1: JeffBot Welcome Message (Quick Win)

When the chat has zero messages, show an interactive welcome card instead of the current empty state icon. This card would:
- Introduce JeffBot with a personality-driven blurb ("I'm JeffBot, your Survivor encyclopedia!")
- Show 2-3 tappable example prompts (e.g., "Who won Season 45?", "Best blindsides ever?", "Explain the idol rules")
- Tapping a prompt auto-fills the chat input with `@jeffbot <question>`

This replaces the current generic "No messages yet / Try @jeffbot" placeholder with something actionable.

**Technical details:**
- Modify `LeagueChat.tsx` empty state (around line 175-183)
- Add clickable prompt chips that call `setInputValue("@jeffbot <question>")`
- No backend changes needed

---

## Idea 2: First-Time JeffBot Intro Message (Auto-seeded)

When a league is first created, automatically insert a bot message from JeffBot introducing itself:

> "Hey! I'm JeffBot. Tag me with @jeffbot followed by any Survivor question -- trivia, strategy, history, you name it. Try asking: 'Who has the most individual immunity wins?'"

This way, every league starts with JeffBot visible in the chat history so no one misses it.

**Technical details:**
- Add a database trigger or modify the league creation flow to insert an initial `chat_messages` row with `is_bot = true`
- Could be done via a trigger on `leagues` table INSERT, or in the `CreateLeagueDialog` component after league creation

---

## Idea 3: Onboarding Checklist for Commissioners

Show a dismissible checklist card at the top of the league dashboard for league admins when the league is in early setup. Steps like:

1. Set up your cast (add contestants)
2. Invite players (share invite code)
3. Customize scoring settings
4. Start the draft

Each item links to the relevant tab/action. The checklist auto-completes items based on actual state (e.g., contestants added, members joined). Dismissible via a "Got it" button that saves to `localStorage` or a user preference.

**Technical details:**
- New `CommissionerChecklist.tsx` component
- Rendered conditionally in `LeagueDashboard.tsx` when `isLeagueAdmin` is true
- Check conditions: `state.contestants.length > 0`, `teams.filter(t => t.user_id).length > 1`, `state.mode !== "setup"`, etc.
- Persist dismissal in `localStorage` keyed by league ID

---

## Idea 4: New Player Welcome Tour (Tooltip Walkthrough)

When a user first visits a league dashboard (detected via `localStorage`), show a lightweight tooltip tour highlighting 3-4 key areas:

1. **Play tab** -- "This is where your fantasy game lives"
2. **League tab** -- "Customize your team name and see who's in your league"
3. **Chat bubble** -- "Chat with your league and ask @jeffbot Survivor questions"
4. **Scoring area** (if in game mode) -- "Your commissioner scores events here during episodes"

**Technical details:**
- New `OnboardingTour.tsx` component using a simple state machine
- Renders positioned tooltip popovers near target elements
- Uses existing Radix `Popover` or `Tooltip` primitives
- First-visit detection via `localStorage` key per user per league
- No external library needed -- can build with existing UI components

---

## Idea 5: Help/Info Button with Quick Reference

Add a small `?` help button in the league header (or as a floating button) that opens a sheet/dialog with:

- **How scoring works** -- Brief explanation of the scoring system
- **How the draft works** -- Snake draft vs. linear explanation
- **JeffBot tips** -- How to use @jeffbot with example questions
- **Commissioner tools** -- (shown only to admins) Quick reference for admin capabilities
- **Links** -- Link to invite code, league settings, etc.

**Technical details:**
- New `HelpSheet.tsx` component using existing `Sheet` UI component
- Triggered from a `HelpCircle` icon in the nav bar
- Content is static markdown-like text, role-aware (shows admin content only to admins)

---

## Recommended Priority

| Priority | Idea | Effort | Impact |
|----------|------|--------|--------|
| 1 | JeffBot welcome message (empty chat state) | Small | High -- immediate discoverability |
| 2 | Auto-seeded JeffBot intro message | Small | High -- every league gets it |
| 3 | Commissioner checklist | Medium | High -- reduces admin confusion |
| 4 | Help/info button | Medium | Medium -- always-available reference |
| 5 | New player tooltip tour | Medium | Medium -- first-visit only |

I'd suggest starting with ideas 1 and 2 together (both small, high impact), then tackling the commissioner checklist next.

