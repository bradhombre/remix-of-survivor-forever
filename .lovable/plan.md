

# Survivors Ready -- Full Rebrand

## Overview
Apply the earthy, tribal color palette extracted from the new logo across the entire app, add the logo to key pages, and update all branding text to "Survivors Ready."

---

## 1. Add the logo to the project
- Copy the uploaded image (`user-uploads://Rugged_Logo_for_Survivor_Fantasy_League_1.png`) to `public/logo.png`
- Also set it as the favicon in `index.html`

## 2. Update color palette (`src/index.css`)
Replace the current dark-purple/blue CSS variables with the new earthy/tribal palette:

| Variable | New Value | Rationale |
|----------|-----------|-----------|
| `--background` | `25 20% 12%` | Deep brown-charcoal base |
| `--foreground` | `40 30% 90%` | Warm cream text |
| `--card` | `25 15% 16%` | Slightly lighter brown card |
| `--card-foreground` | `40 30% 90%` | Cream |
| `--popover` | `25 20% 10%` | Dark brown popover |
| `--popover-foreground` | `40 30% 90%` | Cream |
| `--primary` | `33 55% 45%` | Bronze/amber (rope, mask) |
| `--primary-foreground` | `40 30% 92%` | Light cream |
| `--secondary` | `25 35% 22%` | Dark brown (banner) |
| `--secondary-foreground` | `40 30% 90%` | Cream |
| `--muted` | `25 10% 20%` | Subtle dark brown |
| `--muted-foreground` | `30 15% 55%` | Muted tan |
| `--accent` | `38 70% 50%` | Amber/gold (eye glow) |
| `--accent-foreground` | `25 20% 12%` | Dark on gold |
| `--destructive` | `0 55% 45%` | Tribal red |
| `--border` | `25 15% 22%` | Brown border |
| `--input` | `25 15% 18%` | Input bg |
| `--ring` | `33 55% 45%` | Bronze ring |
| `--gradient-start` | `25 25% 10%` | Dark earthy gradient |
| `--gradient-mid` | `30 20% 14%` | Mid brown |
| `--gradient-end` | `20 25% 12%` | Warm dark |
| `--glass-bg` | `30 20% 50% / 0.08` | Warm glass |
| `--glass-border` | `30 20% 50% / 0.15` | Warm glass border |
| `--gold` | `38 70% 50%` | Keep gold |
| `--success` | `142 55% 42%` | Jungle green |
| `--warning` | `38 70% 50%` | Amber |

## 3. Landing page (`src/pages/Index.tsx`)
- Replace the Trophy icon hero with the actual logo (`/logo.png`) as an `<img>` element
- Change heading from "Survivor Fantasy Leagues" to "Survivors Ready"
- Update tagline copy to match the new brand

## 4. Auth page (`src/pages/Auth.tsx`)
- Add the logo above the card
- Update card title area to say "Survivors Ready"

## 5. Leagues page (`src/pages/Leagues.tsx`)
- Add a small logo next to "My Leagues" in the header
- Update the empty-state welcome text from "Survivor Fantasy" to "Survivors Ready"

## 6. League Dashboard header
- Add a small inline logo next to the league name area

## 7. HTML metadata (`index.html`)
- Title and OG tags already say "Survivors Ready" -- keep those, update author meta to "Survivors Ready"
- Set favicon to `/logo.png`

---

## Technical Details

**Files to modify:**
- `public/logo.png` -- new file (copy from upload)
- `index.html` -- favicon + author meta
- `src/index.css` -- full palette swap
- `src/pages/Index.tsx` -- logo + copy
- `src/pages/Auth.tsx` -- logo
- `src/pages/Leagues.tsx` -- logo + copy
- `src/pages/LeagueDashboard.tsx` -- small logo in header

**No database changes required.** No new dependencies needed.

