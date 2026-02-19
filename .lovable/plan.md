

# Phase 11: Final Polish

## 11.1 — Season Progress Tracker

Add a compact progress bar/badge section at the top of the GameMode component (Play tab), below the header.

**What it shows:**
- "Episode 5 of 13" (Survivor typically has 13 episodes; we can make 13 the default total or derive it)
- Pre-Merge / Post-Merge badge with color coding
- "12 of 18 remaining" contestants count (non-eliminated vs total)

**Implementation:**
- Create a new `SeasonProgressBar` component
- Place it inside `GameMode.tsx` right after the header `div` (around line 333)
- Uses the existing `Progress` component, `Badge` component, and simple math on contestants array
- Total episodes defaults to 13 (standard Survivor) but could be made configurable later

**Visual design:** A single compact row with a thin progress bar and inline badges, fitting the existing glass card aesthetic.

---

## 11.2 — Empty States

Review and add actionable empty states to these screens:

| Screen | Current State | Improvement |
|--------|--------------|-------------|
| **SetupMode** (no contestants) | Just an empty list | Show "No contestants added yet" message with arrow pointing to Add form and Import Cast button |
| **GameMode** scoring events section | Shows "No events yet" text | Enhance to "No points scored yet this episode. Use the buttons above to score actions." |
| **HistoryMode** (no archived seasons) | Already has empty state | Already good -- just verify wording matches spec |
| **DraftMode** (no contestants to draft) | Would show empty grid | Add "Contestants need to be added in the Admin tab before drafting" message |
| **LeagueChat** (no messages) | Likely shows empty area | Add "No messages yet. Start the conversation!" |
| **NewsFeed** (no posts) | May show nothing | Already collapses when empty; no change needed |

**Implementation:** Add conditional renders in each component checking array lengths, displaying helpful text and action buttons where possible.

---

## 11.3 — Mobile Responsiveness Check

Targeted fixes based on code review:

1. **Tab navigation (LeagueDashboard):** The 4-tab bar already uses `flex gap-2` with `sm` buttons. Add `overflow-x-auto` and `flex-nowrap` to prevent wrapping on very small screens (320px). Hide icon text on xs screens.

2. **LeagueInfo table:** The members table uses `<Table>` which can overflow. Wrap in a `div` with `overflow-x-auto`.

3. **GameMode header:** Already has mobile layout (isMobile check). Verify button sizes meet 44px min tap target -- the `size="sm"` buttons are 36px tall. Increase to `min-h-[44px]` on mobile.

4. **QR code in LeagueInfo:** Verify the QR code renders at a scannable size (min 150px). Currently uses `<QRCodeSVG>` -- check its size prop.

5. **SetupMode contestant list and forms:** The grid layout uses `md:grid-cols-2` which is fine. Ensure input fields and buttons don't overflow on 320px screens.

6. **Modals/Dialogs:** Check `FinalPredictionDialog` and other dialogs for max-width and padding on mobile. Add `max-h-[80vh] overflow-y-auto` to dialog content if not already present.

---

## Technical Details

### New File
- `src/components/SeasonProgressBar.tsx` -- compact progress indicator component

### Modified Files
- `src/components/GameMode.tsx` -- add SeasonProgressBar, improve empty scoring events message
- `src/components/SetupMode.tsx` -- add empty state for no contestants
- `src/components/DraftMode.tsx` -- add empty state when no contestants available
- `src/components/LeagueChat.tsx` -- add empty messages state
- `src/pages/LeagueDashboard.tsx` -- add overflow-x-auto to tab bar, mobile tap target fixes
- `src/components/LeagueInfo.tsx` -- wrap table in overflow-x-auto container

### No Database Changes Required

