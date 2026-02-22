

## Add "Buy Me a Coffee" to the Global Footer

The donate button currently only appears on the landing page and Leagues page, but not on league dashboards or other pages. This plan adds it to the global `AppFooter` so it's visible everywhere, right next to "Report a Bug."

### Changes

**`src/components/AppFooter.tsx`**
- Import and render `DonateButton` next to the "Report a Bug" button
- Add a small separator between the two items
- Use a flex layout with a gap to keep them visually balanced

### Technical Details

- The `DonateButton` component already handles its own loading state and hides itself when no `donate_url` is configured, so no extra logic is needed
- The duplicate `<DonateButton />` instances on `src/pages/Index.tsx` (line ~80) and `src/pages/Leagues.tsx` (line ~267) can be removed since the footer now covers all pages

