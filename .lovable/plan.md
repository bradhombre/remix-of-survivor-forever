

# Update fetch-cast-images to Use Firecrawl Web Search

## Overview
Replace the current AI-guessing approach with Firecrawl's **search API** to find real, working contestant headshot URLs from CBS and Survivor Wiki pages.

## Strategy

The new approach uses a **3-tier search** for each contestant:

```text
For each contestant:
  1. Firecrawl Search  -->  "Survivor [Season] [Name] CBS headshot"
     |                      Extract image URLs from search results
     v
  2. Firecrawl Scrape  -->  Scrape the Survivor Wiki page for the contestant
     |                      Extract profile image from page HTML
     v  
  3. AI Fallback       -->  Use Lovable AI to analyze scraped content
     |                      and identify the best headshot URL
     v
  4. URL Validation    -->  HEAD request to confirm image is accessible
```

## Changes to `supabase/functions/fetch-cast-images/index.ts`

### What Changes

1. **Add Firecrawl search function** - Uses `FIRECRAWL_API_KEY` to call the Firecrawl Search API with a query like `"Survivor Season 50 [Name] official CBS headshot photo"`. Extracts image URLs from the search results' markdown content.

2. **Add Firecrawl scrape function** - If search doesn't find an image, scrape the contestant's Survivor Wiki page directly (`https://survivor.fandom.com/wiki/[Name]`) and extract the profile image URL from the page content.

3. **Keep AI as fallback** - If Firecrawl doesn't find images, fall back to the existing Lovable AI approach for best-effort guessing.

4. **Remove hardcoded URL patterns** - The `generateWikiImageUrls` function becomes unnecessary since Firecrawl will find real URLs.

5. **Add `FIRECRAWL_API_KEY` check** - Verify the key exists at startup; log a warning if missing but continue with AI-only fallback.

### New Search Flow (per contestant)

**Step 1 - Firecrawl Search:**
- Query: `"Survivor Season [X] [Name] CBS official photo"`
- Parse results for image URLs from CBS, Paramount, or Wikia domains
- If found and validated, use it

**Step 2 - Firecrawl Scrape (if search fails):**
- Scrape `https://survivor.fandom.com/wiki/[Name_(Survivor_[X])]`
- Extract the main profile image from the page HTML/markdown
- Wiki profile images follow patterns like `static.wikia.nocookie.net/survivor/images/...`

**Step 3 - AI Fallback (if scrape fails):**
- Use existing Lovable AI approach as last resort

### Rate Limiting
- 500ms delay between Firecrawl API calls (respecting their rate limits)
- Sequential processing to avoid overwhelming the API

## No Frontend Changes Needed
The CastManager UI already handles calling this edge function and displaying progress -- only the backend logic changes.

## Files Modified

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/fetch-cast-images/index.ts` | Rewrite | Replace AI-guessing with Firecrawl search + scrape pipeline |

