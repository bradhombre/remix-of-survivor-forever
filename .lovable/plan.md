
# Move "Delete Account" Into a Dropdown Menu

## Problem
The "Delete Account" button is prominently displayed in the header right next to "Sign Out", which is too visible for a destructive, rarely-used action.

## Solution
Replace the standalone "Sign Out" and "Delete Account" buttons with a single user menu dropdown (using the existing `DropdownMenu` component). This keeps the header clean while still providing easy access.

## Changes (single file: `src/pages/Leagues.tsx`)

### 1. Replace the two buttons with a DropdownMenu
- Remove the separate "Sign Out" and "Delete Account" buttons from the header
- Add a single icon button (e.g., a user/settings icon) that opens a dropdown menu
- The dropdown will contain:
  - **Sign Out** -- normal item
  - **Delete Account** -- destructive-styled item at the bottom, separated by a divider

### 2. Add imports
- Import `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger` from the existing UI components
- Keep the existing `MoreVertical` or use `User` icon for the trigger

### Resulting header layout
```
[Logo] My Leagues                    [Admin?] [User Menu ▾]
                                               ├─ Sign Out
                                               ├─ ─────────
                                               └─ Delete Account (red)
```

The AlertDialog confirmation for delete remains unchanged.
