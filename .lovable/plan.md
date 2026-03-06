

## Fix: Super Admin League View Shows Onboarding & Grayed Content

### Problem
When a super admin drops into a league via the admin panel, two things make it hard to inspect the league:
1. The **OnboardingTour** fires for every league they haven't visited before, covering the screen with a modal walkthrough
2. The **Game tab** shows grayed out (`opacity-50 pointer-events-none`) content when the draft isn't complete, making it hard to see what's going on

### Changes

**`src/components/OnboardingTour.tsx`**
- Accept a new `isSuperAdmin` prop (or detect it internally)
- Skip the auto-start tour entirely when the user is a super admin visiting a league (they don't need onboarding)

**`src/pages/LeagueDashboard.tsx`**
- Pass `isSuperAdmin` status to `OnboardingTour` so it can suppress itself
- Get this from the existing `useIsSuperAdmin` hook (already used elsewhere)
- For the grayed-out game view: when user is a super admin, remove the `opacity-50 pointer-events-none` classes so they can actually see and interact with the league state

### Technical Detail
- Import `useIsSuperAdmin` in LeagueDashboard
- Pass `isSuperAdmin` to `OnboardingTour`; in OnboardingTour, add `if (isSuperAdmin) return;` before the auto-start effect
- Change the gray-out condition on line 348 from `!canShowGame` to `!canShowGame && !isSuperAdmin`
- Similarly for the "draft not complete" info banner on lines 340-347, hide it for super admins or make it less obtrusive

