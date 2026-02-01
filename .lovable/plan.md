
# Bulk Image Fetch Helper for Cast Manager

## ✅ IMPLEMENTED

### Backend: `supabase/functions/fetch-cast-images/index.ts`
- Edge function that processes contestants and attempts to find headshots
- Uses Lovable AI to suggest image URLs based on contestant names
- Falls back to URL pattern generation for Survivor Wiki
- Validates URLs before saving
- Rate-limited processing (300ms between requests)
- Returns detailed results with success/failure per contestant

### Frontend: `src/components/admin/CastManager.tsx`
- **"Fetch Images" button** in toolbar showing count of missing images
- **Progress dialog** with real-time status updates
- **Per-row image fetch button** for individual contestants
- Results summary showing found/not found counts
- Failed contestants list in collapsible section

## 🔧 LIMITATION: No Real Web Search

The current implementation uses Lovable AI (which has static knowledge) to suggest image URLs. For **real web search capability**, you would need to connect one of these:

1. **Perplexity Connector** - AI-powered web search with grounded results
2. **Firecrawl Connector** - Web scraping to fetch actual image URLs from CBS/Wiki pages

Without a web search connector, the AI can only suggest URLs based on its training data, which may not find actual working images.

## How to Enable Full Functionality

1. Ask Lovable to "connect Perplexity" or "connect Firecrawl"
2. The edge function can then be updated to use real web search
3. This would enable finding actual current image URLs from the web

## Files Created/Modified

| File | Status |
|------|--------|
| `supabase/functions/fetch-cast-images/index.ts` | ✅ Created |
| `supabase/config.toml` | ✅ Updated |
| `src/components/admin/CastManager.tsx` | ✅ Updated |
