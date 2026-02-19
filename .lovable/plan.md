

# Fix "Start Draft" Button Text

## Problem
The button says "Start Draft (24/16 contestants)" which is confusing -- it implies 16 are needed but 24 exist, shown as a fraction. The `/16` threshold is also hardcoded and doesn't account for game type.

## Solution
Change the button text and logic to be clearer:

**In `src/components/SetupMode.tsx`:**

1. **Line 863** -- Change the button label from `Start Draft ({contestants.length}/16 contestants)` to something like:
   - When ready: `Start Draft ({contestants.length} contestants ready)`
   - When not ready: `Start Draft ({contestants.length}/16 contestants added)`

2. **Line 281** -- The `canStartDraft` check (`contestants.length >= 16`) stays as-is since this component is only used in the admin/setup flow for the full fantasy mode.

3. **Lines 866-868** -- Update the helper text from "Need at least 16 contestants" to "Add at least 16 contestants to start the draft" for clarity.

This is a one-file change to `src/components/SetupMode.tsx` -- just updating the display text on lines 863 and 867.
