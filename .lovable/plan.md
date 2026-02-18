

# Fix Cast Image Fetching - Reliable Approach

## Problem
The current multi-tier scraping approach (Firecrawl wiki scrape, search, AI fallback) is fundamentally flawed:
- It scrapes individual wiki pages and picks the first non-junk image, which is often the wrong contestant
- Q Burdette got Ben's Season 46 thumbnail
- Aubry Bracco and Cirie Fields got random E! Online article images
- 21 other contestants have no images at all

## Root Cause
Individual contestant wiki pages for Season 50 may not exist yet (it's a future/current season), and even when they do, the scraper can't distinguish the profile infobox photo from other images on the page.

## Solution: Scrape the CBS Cast Page + AI Extraction

Instead of scraping 24 individual wiki pages, scrape the **single official CBS Survivor Season 50 cast page** which lists all contestants with their official headshots in a structured format. Use Firecrawl to get the page content, then use the Lovable AI model to extract name-to-image mappings from the HTML.

```text
Flow:
  1. Firecrawl scrape CBS cast page (single request)
     --> Get HTML with all contestant photos
  2. AI extraction (Gemini Flash)
     --> Parse HTML, return JSON mapping: { name: image_url }
  3. Match to database contestants by name similarity
  4. Validate each URL with HEAD request
  5. Update master_contestants table
```

### Why This Is Better
- One page has ALL contestants with correct photos next to their names
- No risk of grabbing the wrong person's image
- Uses 1 Firecrawl credit instead of 24+
- AI parses structured content (reliable) instead of guessing URLs (unreliable)

## Technical Details

### Changes to `supabase/functions/fetch-cast-images/index.ts`

1. **New Tier 0: CBS Cast Page Scrape** - Scrape `https://www.cbs.com/shows/survivor/cast/` (or the season-specific URL) using Firecrawl. Extract all contestant headshots at once using AI to parse the HTML into a name-image mapping.

2. **Fallback: Individual wiki scrape** - Keep existing logic as fallback for any contestants not matched from the CBS page, but add name-matching logic: only accept images where the filename contains part of the contestant's name.

3. **Reset wrong images** - Clear all 3 incorrect `image_url` values before re-running.

### Implementation Steps

1. Clear incorrect images for Aubry, Cirie, and Q in `master_contestants`
2. Rewrite the edge function with the CBS-first approach:
   - Scrape the CBS cast page via Firecrawl (formats: html + markdown)
   - Send the content to Gemini Flash with a prompt to extract a JSON array of `{name, image_url}` pairs
   - Fuzzy-match extracted names to database contestant names
   - Validate URLs and update the database
   - Fall back to individual wiki scrape for any unmatched contestants
3. Deploy and test

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/fetch-cast-images/index.ts` | Major rewrite: add CBS cast page bulk scrape as primary strategy, use AI for structured extraction, keep wiki scrape as fallback with name-matching |

