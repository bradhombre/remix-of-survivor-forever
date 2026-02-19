

# Branding Consistency: "Survivors Ready" with Subtitle "Survivor Fantasy League"

The app already uses "Survivors Ready" branding in most places. Here are the refinements:

## Changes

### 1. `src/components/SetupMode.tsx`
- Change the setup heading from "Survivor Fantasy League" to "Survivors Ready" with "Survivor Fantasy League" as a smaller subtitle beneath it

### 2. `src/pages/NotFound.tsx`
- Restyle to match the app's dark theme (use `bg-background`, `text-foreground`, etc.)
- Add the logo at the top
- Change the heading to "Lost on the Island" or similar on-brand 404 message
- Update the link styling to use the app's primary color

### 3. `src/pages/Auth.tsx`
- Update CardTitle to say "Survivors Ready" instead of generic "Welcome back" / "Create account"
- Keep CardDescription as-is ("Sign in to Survivors Ready" / "Create your Survivors Ready account")

### 4. `src/pages/Index.tsx`
- Add "Survivor Fantasy League" as a small subtitle/badge above or below the main "Survivors Ready" heading (it currently only has the descriptive paragraph)

### 5. `index.html`
- Already correct — no changes needed

## Summary of files
- `src/components/SetupMode.tsx` — Update heading hierarchy
- `src/pages/NotFound.tsx` — Restyle with branding
- `src/pages/Auth.tsx` — Branded card title
- `src/pages/Index.tsx` — Add subtitle

