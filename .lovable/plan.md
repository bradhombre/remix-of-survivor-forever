

# Automatic Survivor News Feed Integration

## Overview

This plan adds automatic fetching of Survivor news from external RSS feeds, specifically using Inside Survivor's spoiler-free news category feed. The system will periodically sync news from the RSS feed into the database, filtering out any content marked as spoilers.

## How It Works

The current news system stores posts in the `news_posts` table with fields for `title`, `content`, `is_spoiler`, `published_at`, and `expires_at`. We will:

1. Create a backend function that fetches RSS feeds from spoiler-free sources
2. Parse the XML feed and extract news articles
3. Store new articles in the database (avoiding duplicates)
4. Run this automatically on a schedule (e.g., every 6 hours)
5. Keep the existing manual posting system for platform-specific announcements

## Data Source

**Inside Survivor** provides category-specific RSS feeds:
- `https://insidesurvivor.com/category/news/feed` - Official announcements, casting news, premiere dates (spoiler-free)
- `https://insidesurvivor.com/category/features/feed` - Features, reviews, retrospectives (spoiler-free)

We will specifically avoid:
- `https://insidesurvivor.com/category/spoilers/feed` - Contains boot orders, elimination leaks

## Implementation Details

### 1. Database Changes

Add columns to track external news sources:

| Column | Type | Purpose |
|--------|------|---------|
| `source` | text | Origin of the post ('manual', 'rss_insidesurvivor') |
| `external_id` | text | Unique identifier from source (URL) to prevent duplicates |
| `source_url` | text | Link back to original article |

### 2. New Backend Function: `fetch-survivor-news`

Creates a new edge function that:
- Fetches RSS XML from Inside Survivor's news feed
- Parses the XML to extract title, content (description), link, and publish date
- Checks for existing posts by `external_id` to avoid duplicates
- Inserts new articles with `is_spoiler = false` (since we use spoiler-free feeds)
- Sets expiration to 30 days (configurable) so old news auto-hides

```text
Flow:
[Cron/Manual Trigger] --> [fetch-survivor-news edge function]
                                    |
                                    v
                      [Fetch RSS from insidesurvivor.com/category/news/feed]
                                    |
                                    v
                      [Parse XML, extract articles]
                                    |
                                    v
                      [Check for duplicates by external_id]
                                    |
                                    v
                      [Insert new posts into news_posts table]
```

### 3. Scheduled Sync (Cron Job)

Set up a PostgreSQL cron job to call the edge function every 6 hours:

```sql
select cron.schedule(
  'fetch-survivor-news-every-6h',
  '0 */6 * * *',
  -- HTTP POST to edge function
);
```

### 4. Admin Panel Enhancements

Add to the NewsManager component:
- "Sync Now" button to manually trigger RSS fetch
- Visual indicator showing which posts are from RSS vs manual
- Filter toggle to show only manual or only RSS posts
- Last sync timestamp display

### 5. Frontend Updates

Update NewsFeed component:
- Add source link icon that opens the original article
- Show source attribution (e.g., "via Inside Survivor")
- Increase post limit from 3 to 5 for more content

## Spoiler Protection Strategy

| Layer | Protection |
|-------|------------|
| **Source Selection** | Only fetch from `/category/news/feed` and `/category/features/feed` - explicitly exclude `/category/spoilers/feed` |
| **Keyword Filtering** | Scan titles for spoiler keywords (elimination, voted out, boot) and skip those articles |
| **Auto-Expiration** | RSS posts expire after 30 days, reducing stale/risky content |
| **Manual Override** | Admins can still mark any post as spoiler, hiding it from users |

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp].sql` | Create | Add `source`, `external_id`, `source_url` columns to `news_posts` |
| `supabase/functions/fetch-survivor-news/index.ts` | Create | Edge function to fetch and parse RSS feed |
| `src/components/admin/NewsManager.tsx` | Modify | Add sync button, source indicators, filters |
| `src/components/NewsFeed.tsx` | Modify | Show source attribution and link to original |
| `supabase/config.toml` | Modify | Register new edge function |

## Technical Notes

### RSS Parsing in Deno

The edge function will use the `deno.land/x/rss` module:

```typescript
import { parseFeed } from "https://deno.land/x/rss/mod.ts";

const response = await fetch("https://insidesurvivor.com/category/news/feed");
const xml = await response.text();
const feed = await parseFeed(xml);

for (const entry of feed.entries) {
  // entry.title, entry.description, entry.links[0].href, entry.published
}
```

### Duplicate Prevention

Each RSS entry has a unique URL. We'll store this as `external_id` and use an upsert:

```sql
INSERT INTO news_posts (title, content, source, external_id, source_url, ...)
ON CONFLICT (external_id) DO NOTHING;
```

This requires adding a unique constraint on `external_id`.

### Security

- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` to insert posts (bypassing RLS)
- No user authentication needed for the cron trigger
- Rate limiting: Only sync every 6 hours to respect the source site

