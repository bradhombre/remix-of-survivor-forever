
# Fix League Size Box to Auto-Expand

## Problem
The "League Size" section in the Admin Setup tab has a fixed maximum height of 200px on the team slots container. When there are more than 3-4 teams, users must scroll to see all team slots, which is not intuitive.

## Solution
Remove the fixed `max-h-[200px]` constraint from the team slots container so it automatically expands to show all teams. This provides a better user experience by making all team slots visible without requiring scrolling.

## Change Summary

| File | Change |
|------|--------|
| `src/components/SetupMode.tsx` | Remove `max-h-[200px] overflow-y-auto` from team slots container |

## Technical Details

**Current code (line 390):**
```tsx
<div className="space-y-2 max-h-[200px] overflow-y-auto">
```

**Updated code:**
```tsx
<div className="space-y-2">
```

This simple change removes the height constraint and scrolling behavior, allowing the container to naturally expand based on the number of teams in the league (2-20 teams).

## Considerations
- With up to 20 teams, the card will grow taller, but this is acceptable since it provides better visibility
- The page itself is scrollable, so users can still navigate if the league is large
- This matches the UX expectation that all team slots should be immediately visible
