

# Fix: Fetch Cast Images - Firecrawl Key Not Available

## Problem
The `fetch-cast-images` edge function logs show `FIRECRAWL_API_KEY not set`, so it skips Firecrawl entirely and falls back to the AI model -- which hallucinates URLs that fail validation. Result: 0 images found for all 22 contestants.

The Firecrawl connector is linked to the project, but the secret may not be injected under the name `FIRECRAWL_API_KEY`, or it may require using the Firecrawl connector gateway instead of direct API calls.

## Fix Strategy

Rather than relying on the `FIRECRAWL_API_KEY` environment variable directly, we should use the **connector gateway pattern** -- calling Firecrawl through dedicated edge functions that the connector provisions, or restructure to use a simpler, more reliable approach.

**However**, the simplest fix is: the connector IS linked and the key should be available. We need to update the edge function to also try alternative env var names the connector might use (e.g., `FIRECRAWL_KEY`, `FC_API_KEY`), and add detailed logging to surface what environment variables are actually available.

### Revised Approach: Direct Wiki Scraping Without Firecrawl

Since the AI fallback also fails (it can't browse the web), and the Firecrawl key injection is unreliable, a more robust approach is to **scrape the Survivor Wiki directly** using plain `fetch()` -- no API key needed. The Survivor Wiki pages are publicly accessible.

### Updated Edge Function Logic

```text
For each contestant:
  1. Direct Wiki Fetch  -->  Fetch survivor.fandom.com HTML directly
     |                      Parse <img> tags for profile images
     v
  2. Firecrawl Search   -->  If FIRECRAWL_API_KEY available, use it
     |                      (bonus tier, not required)
     v
  3. AI-Assisted Parse  -->  If direct fetch got HTML but no image found,
     |                      send HTML snippet to AI to extract image URL
     v
  4. Validate URL       -->  HEAD request to confirm image accessible
```

### Key Changes to `supabase/functions/fetch-cast-images/index.ts`

1. **Add direct wiki fetch as Tier 1** - Use plain `fetch()` to get the Survivor Wiki page HTML, then parse it with regex to find the profile infobox image. No API key required.

2. **Keep Firecrawl as optional Tier 2** - If `FIRECRAWL_API_KEY` is available, use Firecrawl search as a secondary option.

3. **Improve AI fallback (Tier 3)** - Instead of asking AI to "find a URL" (which it can't do), send it the actual HTML/text content from the wiki page and ask it to extract the profile image URL from it.

4. **Add debug logging** - Log whether each env var is set so we can diagnose connector issues.

### Direct Wiki Fetch Implementation

The Survivor Wiki profile pages have a predictable structure:
- URL pattern: `https://survivor.fandom.com/wiki/[Name]` or `https://survivor.fandom.com/wiki/[Name]_(Survivor_[Season])`  
- Profile images are in the page's infobox, typically the first large image from `static.wikia.nocookie.net`
- We fetch the raw HTML and extract image URLs matching the wikia CDN pattern

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/fetch-cast-images/index.ts` | Add direct wiki HTML fetch as primary tier; keep Firecrawl as optional; improve AI fallback to parse provided content instead of guessing |

