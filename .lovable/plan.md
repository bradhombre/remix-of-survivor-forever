

# Revised Design System — Matching the Logo

## Problem with Current Design
The current palette is too dark and monotone — essentially a near-black brown that feels lifeless. The logo has rich warmth: parchment tan, golden amber, jungle green foliage, and warm brown textures. The app should feel like a weathered treasure map or tribal council, not a dark void.

## New Direction: Warm Parchment + Deep Jungle

Instead of a nearly-black background, shift to a **warm dark-tan base** with **jungle green accents** and **golden highlights**. This creates visual interest and matches the logo's vibe.

### Updated Color Palette (`src/index.css`)

| Variable | New Value | Rationale |
|----------|-----------|-----------|
| `--background` | `30 25% 15%` | Warmer, richer brown (less black) |
| `--foreground` | `38 40% 92%` | Warm parchment white |
| `--card` | `28 22% 19%` | Visible card separation from bg |
| `--card-foreground` | `38 40% 92%` | Parchment |
| `--popover` | `28 25% 13%` | Deep brown popover |
| `--popover-foreground` | `38 40% 92%` | Parchment |
| `--primary` | `36 65% 48%` | Richer golden amber (torch/fire) |
| `--primary-foreground` | `30 30% 10%` | Dark text on gold buttons |
| `--secondary` | `150 25% 22%` | **Jungle green** — the foliage from the logo |
| `--secondary-foreground` | `38 40% 92%` | Parchment on green |
| `--muted` | `30 15% 22%` | Subtle warm brown |
| `--muted-foreground` | `35 20% 55%` | Warm tan (readable) |
| `--accent` | `36 80% 55%` | Bright gold (eye glow, highlights) |
| `--accent-foreground` | `30 30% 10%` | Dark on gold |
| `--destructive` | `5 60% 48%` | Tribal red-orange |
| `--destructive-foreground` | `0 0% 100%` | White |
| `--success` | `145 50% 40%` | Jungle green (matches logo leaves) |
| `--success-foreground` | `0 0% 100%` | White |
| `--warning` | `36 80% 55%` | Amber |
| `--warning-foreground` | `30 30% 10%` | Dark |
| `--border` | `30 18% 26%` | Visible warm brown border |
| `--input` | `28 18% 21%` | Input slightly lighter than card |
| `--ring` | `36 65% 48%` | Gold ring |
| `--gradient-start` | `30 28% 12%` | Deep warm base |
| `--gradient-mid` | `25 22% 17%` | Mid brown with warmth |
| `--gradient-end` | `35 20% 14%` | Warm dark end |
| `--glass-bg` | `36 30% 50% / 0.1` | Warmer glass with golden tint |
| `--glass-border` | `36 30% 50% / 0.18` | Golden glass border |
| `--gold` | `38 75% 52%` | Brighter gold |
| `--silver` | `0 0% 75%` | Keep |
| `--bronze` | `25 70% 52%` | Keep |

### Key Differences from Current
- **Background is warmer and slightly lighter** — feels like aged leather instead of coal
- **Secondary is now jungle green** instead of another brown shade, adding the foliage color from the logo
- **Primary/accent are richer gold** — more saturation to pop against the warm bg
- **Borders are more visible** — cards actually stand out from the background
- **Glass effects have a golden tint** instead of neutral

### Additional Style Enhancements

**Body gradient**: Add a subtle texture feel using the gradient with more warmth variation.

**Buttons**: The primary buttons will now be a rich gold with dark text (like the banner in the logo), instead of muted bronze-on-cream.

**Cards**: Slightly lighter brown with visible borders, creating depth like layered parchment.

## Files to Modify
- `src/index.css` — Full palette revision with the values above

## What Stays the Same
- Logo placements (already done, those are good)
- All component structure and layout
- Tailwind config (it just references CSS variables)
- No database changes

## Technical Details
This is a CSS-only change — just updating the HSL values in `src/index.css`. All components already reference these variables through the Tailwind config, so the new palette propagates everywhere automatically.
