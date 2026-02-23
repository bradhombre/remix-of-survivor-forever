

## Split "Play" Tab into "Draft" and "Game" Tabs

Instead of hiding the game view until the draft completes, show both tabs side by side so new players can explore the leaderboard/scoring UI at any time -- even before drafting starts.

### What Changes

**Current behavior:** A single "Play" tab that conditionally shows either the Draft or Game view based on draft completion.

**New behavior:** Two separate tabs:
- **Draft** tab (visible during setup/draft phases; hidden once the game starts)
- **Game** tab (always visible, even during setup/draft)

During setup/draft, the Game tab shows the real leaderboard with zero scores and a subtle banner like "The game begins after the draft completes" so players understand they're previewing the experience.

Once the draft completes, the Draft tab disappears and Game becomes the default -- exactly as it works today, just without the confusion.

### User Experience

- New players can tap "Game" at any time to see the leaderboard, scoring UI, and contestant cards
- They immediately understand what the post-draft experience looks like
- No fake mockups needed -- it's the real UI with real (zeroed) data
- The GameplayTips card still appears on the Game tab to explain mechanics

### Technical Details

**Edit: `src/pages/LeagueDashboard.tsx`**

1. Update `ViewMode` type from `"play" | "history" | "league" | "admin"` to `"draft" | "game" | "history" | "league" | "admin"`
2. Default tab logic:
   - If draft is complete (`canShowGame`), default to `"game"` and hide the Draft tab
   - If still in setup/draft, default to `"draft"` and show both Draft and Game tabs
3. Replace the single "Play" button in the nav with two buttons:
   - **Draft** button (with a target/clipboard icon) -- only shown when `!canShowGame`
   - **Game** button (with the Trophy icon) -- always shown
4. In the Game tab content, when `!canShowGame`, wrap the existing GameMode/WinnerTakesAllMode in a container that adds a small info banner at the top: "Draft in progress -- scores will update once the draft is complete"
5. Move `CommissionerChecklist` to show on the Draft tab instead of the old Play tab
6. Move `GameplayTips` to show on the Game tab regardless of draft state

**No new files needed.** This is a restructure of the existing tab logic in `LeagueDashboard.tsx` only.
