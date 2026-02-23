

## Fix Tips Text, Improve Draft Banner, and Explore Scoring Ease-of-Use

Three changes addressing your feedback:

### 1. Fix "How the Game Works" - Scoring Events Text

Update the Scoring Events tip from "Commissioners tap..." to "Commissioners or players tap a contestant to score actions..."

**File:** `src/components/GameplayTips.tsx` (line 33)

### 2. Improve Draft-in-Progress Banner and Gray Out the Game Tab

- Change the banner text to: **"This page will be active once the draft is complete. Take a look around to see how scoring works!"**
- Wrap the game content below the banner in a semi-transparent overlay with `opacity-50 pointer-events-none` so it looks visually inaccessible but still previews the layout

**File:** `src/pages/LeagueDashboard.tsx` (lines 307-348)

### 3. About Automated Scoring

Unfortunately, there's no public real-time Survivor data API (CBS/Paramount doesn't offer one), so fully automated scoring isn't possible. However, there are ways to make scoring **much faster and less tedious**:

**Already available:** Bulk actions like "Mark All Survivors" and "Award Jury Points" that score many contestants in one tap.

**Potential future improvements (not in this plan, but options to consider):**
- **Episode Score Card:** A single form where the commissioner checks off everything that happened in an episode (who won immunity, who found an idol, who cried, who was voted out) and submits it all at once instead of tapping individual contestants
- **Player Self-Scoring:** Let all league members submit scoring events (with commissioner approval/review) so the work is shared
- **Score Import:** Allow pasting a simple list of events from a recap site

Would you like me to build the Episode Score Card as a follow-up?

### Technical Details

**`src/components/GameplayTips.tsx`**
- Update the `TIPS` array entry for "Scoring Events" to say "Commissioners or players tap..."

**`src/pages/LeagueDashboard.tsx`**
- Update the info banner text inside the `!canShowGame` block
- Add a wrapper `div` with `opacity-50 pointer-events-none` around the game content (GameMode/WinnerTakesAllMode) when `!canShowGame` is true, so the preview appears grayed out and non-interactive

