

# Display Contestant Headshots Throughout the App

## Overview
Bring the contestant headshot images (fetched via Firecrawl into `master_contestants`) into the actual gameplay experience. Currently images are only visible in the Admin Cast Manager -- this plan adds them everywhere contestants appear.

## Data Bridge Strategy

The per-session `contestants` table doesn't have an `image_url` column. We need to add one so images flow into gameplay views.

```text
master_contestants (platform-wide)         contestants (per-session)
+------------------+                       +------------------+
| name             |  --- Import Cast -->  | name             |
| image_url   [*]  |                       | image_url   [NEW]|
| tribe            |                       | tribe            |
| age              |                       | age              |
+------------------+                       +------------------+
```

## Changes

### 1. Database Migration
- Add `image_url TEXT` column to the `contestants` table
- This stores the headshot URL per-session contestant

### 2. Update the Contestant Type
**File: `src/types/survivor.ts`**
- Add `imageUrl?: string` to the `Contestant` interface

### 3. Update Import Official Cast Flow
**File: `src/components/SetupMode.tsx`**
- When importing from `master_contestants`, also fetch and pass `image_url` so it gets stored in the session's `contestants` table

### 4. Update Game State Hooks
**File: `src/hooks/useGameStateDB.ts`**
- Include `image_url` in SELECT queries for contestants
- Map `image_url` to `imageUrl` in the Contestant objects

### 5. Create a ContestantAvatar Component
**New file: `src/components/ContestantAvatar.tsx`**
- Small reusable component: shows the headshot image in a circular avatar, with initials fallback
- Props: `name`, `imageUrl`, `size`, `isEliminated` (adds grayscale/opacity)

### 6. Add Headshots to Game Views

**GameMode** (`src/components/GameMode.tsx`)
- Team roster cards: add avatar next to each contestant name
- All-contestants scoring view: add avatar in contestant rows
- Eliminated contestants get a grayscale/dimmed avatar

**DraftMode** (`src/components/DraftMode.tsx`)
- Available contestants grid: show headshot above name in each draft button
- Drafted contestants list: small avatar next to name in team cards

**SetupMode** (`src/components/SetupMode.tsx`)
- Contestant list: small avatar next to name if image exists

**HistoryMode** (`src/components/HistoryMode.tsx`)
- Archived team rosters: avatar next to contestant name

**FinalPredictionDialog** (`src/components/FinalPredictionDialog.tsx`)
- Select dropdowns: show avatar next to contestant names in the finalist/vote-out selectors

### 7. Update AdminPanel Contestant Display
**File: `src/components/AdminPanel.tsx`**
- Add small avatar thumbnails next to contestant names in the admin scoring view

## Technical Details

### Database Migration SQL
```sql
ALTER TABLE contestants ADD COLUMN image_url TEXT;
```

### ContestantAvatar Component (new)
```text
Props:
  - name: string
  - imageUrl?: string
  - size: 'xs' | 'sm' | 'md' (default 'sm')
  - isEliminated?: boolean

Renders:
  - Avatar with AvatarImage (if imageUrl exists)
  - AvatarFallback with first initial
  - If eliminated: grayscale filter + reduced opacity
```

### Import Cast Update
The `handleImportOfficialCast` function in SetupMode currently fetches `name, tribe, age, occupation` from `master_contestants`. It needs to also fetch `image_url` and pass it through when creating session contestants.

### Files Changed Summary

| File | Change |
|------|--------|
| Database migration | Add `image_url` column to `contestants` |
| `src/types/survivor.ts` | Add `imageUrl` to Contestant interface |
| `src/components/ContestantAvatar.tsx` | New reusable avatar component |
| `src/hooks/useGameStateDB.ts` | Include `image_url` in queries |
| `src/components/SetupMode.tsx` | Pass image_url during official cast import |
| `src/components/GameMode.tsx` | Add avatars to team rosters and contestant cards |
| `src/components/DraftMode.tsx` | Add avatars to draft buttons and drafted lists |
| `src/components/HistoryMode.tsx` | Add avatars to archived rosters |
| `src/components/FinalPredictionDialog.tsx` | Add avatars to select options |
| `src/components/AdminPanel.tsx` | Add avatar thumbnails |

