
# Bulk Image Fetch Helper for Cast Manager

## Overview
Add a feature that automatically searches for and fetches official Survivor contestant headshots using AI-powered web search, then updates the database with found image URLs.

## How It Works

The feature uses AI to search the web for each contestant's official CBS headshot and extracts the image URL from search results. This is done through a new backend function that processes contestants in batches.

## Architecture

```text
+------------------+     +-------------------------+     +------------------+
|   Cast Manager   | --> |  fetch-cast-images      | --> |  Lovable AI      |
|   (Frontend)     |     |  (Edge Function)        |     |  (Web Search)    |
+------------------+     +-------------------------+     +------------------+
        |                          |                              |
        v                          v                              v
  "Fetch Images"           For each contestant:           Search for:
     button                1. Build search query          "Survivor S50 
        |                  2. Call AI with search           [Name] CBS
        v                  3. Extract image URLs            headshot"
  Progress UI              4. Validate URLs                    |
  showing status           5. Update database                  v
                                                         Return image
                                                         URLs found
```

## Implementation Details

### 1. New Edge Function: `fetch-cast-images`

**Location:** `supabase/functions/fetch-cast-images/index.ts`

**Purpose:** Process a batch of contestants and search for their official headshots using AI.

**Input:**
```json
{
  "season_number": 50,
  "contestant_ids": ["uuid1", "uuid2", ...],  // Optional - if omitted, fetch all missing
  "force_refresh": false  // Re-fetch even if image exists
}
```

**Process:**
1. Fetch contestants from `master_contestants` table
2. For each contestant without an image (or all if force_refresh):
   - Build search query: `"Survivor Season [X] [Name] CBS official headshot photo"`
   - Call Lovable AI with a prompt asking it to find the best official image URL
   - Extract and validate the image URL
   - Update the database record
3. Return results summary

**AI Prompt Strategy:**
```text
Find the official CBS headshot image URL for this Survivor contestant:
- Name: [contestant name]
- Season: [season number]

Search for their official CBS press photo or Survivor Wiki profile image.
Return ONLY the direct image URL (ending in .jpg, .png, or similar).
Prefer CBS.com or static.wikia.nocookie.net sources.
If no official image found, return "NOT_FOUND".
```

### 2. Frontend UI Changes

**Location:** `src/components/admin/CastManager.tsx`

**New Features:**

1. **"Fetch Images" Button**
   - Appears in the toolbar next to CSV Import
   - Shows count of contestants missing images
   - Icon: Image or Download icon

2. **Progress Dialog**
   - Shows while fetching is in progress
   - Displays: "Fetching image 3 of 18..."
   - Progress bar visualization
   - Cancel button to stop early

3. **Results Summary**
   - Toast notification with success count
   - "Found images for 15 of 18 contestants"
   - Failed items shown in a collapsible list

4. **Per-Row Image Fetch**
   - Small button in Actions column for individual fetch
   - Useful for retrying failed contestants

### 3. UI Mockup

**Toolbar Addition:**
```text
[Delete All] [Add Contestant] [Bulk Import] [CSV Import] [🖼️ Fetch Images (5 missing)]
```

**Progress Dialog:**
```text
+----------------------------------------------------------+
|  Fetching Cast Images                                    |
+----------------------------------------------------------+
|                                                          |
|  Searching for official headshots...                     |
|                                                          |
|  [████████████░░░░░░░░░░░░░░░░] 8 / 18                   |
|                                                          |
|  Current: Stephanie Berger                               |
|                                                          |
|  ✅ Found: 7                                             |
|  ❌ Not found: 1                                         |
|                                                          |
|  [Cancel]                                                |
+----------------------------------------------------------+
```

**After Completion:**
```text
Toast: "Found images for 15 of 18 contestants"

Table now shows thumbnail previews instead of "View" links
```

### 4. Image URL Validation

The edge function validates found URLs:
- Must be a valid URL format
- Must end with image extension (.jpg, .jpeg, .png, .webp, .gif)
- Must be accessible (HEAD request returns 200)
- Prefer HTTPS sources

### 5. Rate Limiting Protection

- Process contestants sequentially with 500ms delay between requests
- Handle 429 (rate limit) errors gracefully with exponential backoff
- Allow cancellation mid-process
- Save progress as we go (each successful fetch is immediately saved)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/fetch-cast-images/index.ts` | Create | Edge function for AI-powered image search |
| `supabase/config.toml` | Update | Add function configuration |
| `src/components/admin/CastManager.tsx` | Update | Add Fetch Images button, progress dialog, and results handling |

---

## Technical Considerations

### Why Use AI for Image Search?
- CBS doesn't have a public API for contestant images
- Survivor Wiki uses standardized URL patterns but names vary
- AI can intelligently find the best match across multiple sources
- Handles name variations (nicknames, full names)

### Fallback Sources (Priority Order)
1. CBS Press Express (official source)
2. Survivor Wiki (static.wikia.nocookie.net)
3. CBS.com cast pages
4. People.com / Entertainment Weekly (for recent seasons)

### Error Handling
- If AI can't find an image, mark as "NOT_FOUND" (don't error)
- If API rate limited, pause and retry
- If network error, skip and continue to next contestant
- Always save partial progress

---

## User Experience Flow

1. Admin imports cast via CSV (names, tribes, etc.)
2. Admin clicks "Fetch Images" button
3. Progress dialog shows real-time status
4. On completion, table refreshes with thumbnails
5. Admin can manually fix any missing images via inline edit
