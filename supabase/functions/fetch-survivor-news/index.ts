import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseFeed } from "https://deno.land/x/rss@1.0.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Spoiler keywords to filter out
const SPOILER_KEYWORDS = [
  "voted out",
  "eliminated",
  "boot order",
  "boot list",
  "elimination order",
  "who goes home",
  "who gets voted out",
  "winner spoiler",
  "finale spoiler",
];

// Check if title contains spoiler keywords
function containsSpoilerKeywords(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return SPOILER_KEYWORDS.some((keyword) => lowerTitle.includes(keyword));
}

// Strip HTML tags from content
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Truncate content to reasonable length
function truncateContent(content: string, maxLength = 500): string {
  const cleaned = stripHtml(content);
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + "...";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // RSS feeds to fetch (spoiler-free categories only)
    const feeds = [
      {
        url: "https://insidesurvivor.com/category/news/feed",
        source: "rss_insidesurvivor",
      },
    ];

    let totalInserted = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const feed of feeds) {
      try {
        console.log(`Fetching feed: ${feed.url}`);

        const response = await fetch(feed.url, {
          headers: {
            "User-Agent": "SurvivorFantasyApp/1.0",
          },
        });

        if (!response.ok) {
          errors.push(`Failed to fetch ${feed.url}: ${response.status}`);
          continue;
        }

        const xml = await response.text();
        const parsedFeed = await parseFeed(xml);

        console.log(`Found ${parsedFeed.entries.length} entries`);

        for (const entry of parsedFeed.entries) {
          const title = entry.title?.value || entry.title || "";
          const content =
            entry.description?.value ||
            entry.content?.value ||
            entry.description ||
            "";
          const link = entry.links?.[0]?.href || entry.id || "";
          const published = entry.published || entry.updated || new Date();

          // Skip if no title or link
          if (!title || !link) {
            totalSkipped++;
            continue;
          }

          // Skip articles with spoiler keywords
          if (containsSpoilerKeywords(title as string)) {
            console.log(`Skipping spoiler article: ${title}`);
            totalSkipped++;
            continue;
          }

          // Calculate expiration (30 days from now)
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          // Try to insert (will fail silently on duplicate external_id)
          const { error } = await supabase.from("news_posts").insert({
            title: String(title).substring(0, 255),
            content: truncateContent(String(content)),
            source: feed.source,
            external_id: link,
            source_url: link,
            is_spoiler: false,
            published_at: new Date(published as string | Date).toISOString(),
            expires_at: expiresAt.toISOString(),
          });

          if (error) {
            // Duplicate key error is expected, don't count as error
            if (error.code === "23505") {
              totalSkipped++;
            } else {
              console.error(`Insert error: ${error.message}`);
              errors.push(`Insert error: ${error.message}`);
            }
          } else {
            totalInserted++;
            console.log(`Inserted: ${title}`);
          }
        }
      } catch (feedError) {
        console.error(`Error processing feed ${feed.url}:`, feedError);
        errors.push(`Feed error: ${feed.url} - ${feedError}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: totalInserted,
        skipped: totalSkipped,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
