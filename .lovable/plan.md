

## Move Season Progress Bar Inside the Season Header

Currently, the `SeasonProgressBar` sits above the "Season 50" header as a separate card. The fix is to move it inside the header card so it appears directly below the season title and controls.

### Changes

**File: `src/components/GameMode.tsx`**

1. Remove the standalone `SeasonProgressBar` block (lines 333-338) from above the header card.
2. Place `SeasonProgressBar` inside the `glass-strong` header card (after the controls row), so it renders just below the "Season 50" title and episode controls as a unified section.

This is a small layout change -- just moving a component from one spot to another within the same file.

