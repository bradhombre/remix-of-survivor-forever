
# Fix Cast Image Fetching - COMPLETED ✅

## Solution Implemented

Rewrote `supabase/functions/fetch-cast-images/index.ts` to scrape the **Survivor Wiki season page** (single page with all contestants) instead of 24 individual pages.

### How It Works
1. Firecrawl scrapes `https://survivor.fandom.com/wiki/Survivor_{season_number}` (1 request)
2. `extractCastawaysSection()` isolates the Castaways table HTML from the 200K+ char page
3. `extractCastFromHTML()` parses contestant thumbnails by alt-text pattern `S{num} {name} t` and matches to bold name links
4. `namesMatch()` with `getNameVariants()` handles nicknames like `Benjamin "Coach" Wade` → matches `Coach Wade`
5. Updates all `master_contestants` records

### Results
- **24/24** Season 50 contestants now have correct profile images
- Uses **1 Firecrawl credit** instead of 24+
- No AI needed (direct HTML parsing works reliably)
- AI fallback still available if HTML structure changes
