import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FetchRequest {
  season_number: number;
  contestant_ids?: string[];
  force_refresh?: boolean;
}

interface ContestantResult {
  id: string;
  name: string;
  success: boolean;
  image_url?: string;
  error?: string;
}

// Validate that a URL points to an accessible image
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ImageValidator/1.0)" },
    });
    if (!response.ok) return false;
    const contentType = response.headers.get("content-type") || "";
    return contentType.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(url);
  } catch {
    return false;
  }
}

// Extract wikia CDN image URLs from HTML
function extractWikiaImageUrls(html: string): string[] {
  const pattern = /https?:\/\/static\.wikia\.nocookie\.net\/[^\s"'<>\]\)]+\.(?:jpg|jpeg|png|webp)(?:\/revision\/[^\s"'<>\]\)]*)?/gi;
  const matches = html.match(pattern) || [];
  return [...new Set(matches)].filter((url) => {
    // Skip very small thumbnails
    if (/\/scale-to-width-down\/\d{1,2}(?:$|\?|")/.test(url)) return false;
    return true;
  });
}

// Clean wikia URL to get a reasonable sized version
function cleanWikiaUrl(url: string): string {
  const baseMatch = url.match(/^(https?:\/\/static\.wikia\.nocookie\.net\/[^/]+\/images\/[^/]+\/[^/]+\/[^/]+)/);
  if (baseMatch) {
    return baseMatch[1] + "/revision/latest/scale-to-width-down/400";
  }
  return url;
}

// Fetch wiki page HTML for a contestant
async function fetchWikiHtml(name: string, seasonNumber: number): Promise<string> {
  const cleanName = name.replace(/"/g, "").trim();
  const wikiName = cleanName.replace(/\s+/g, "_");

  const urls = [
    `https://survivor.fandom.com/wiki/${encodeURIComponent(wikiName)}_(Survivor_${seasonNumber})`,
    `https://survivor.fandom.com/wiki/${encodeURIComponent(wikiName)}`,
  ];

  for (const url of urls) {
    console.log(`[Wiki Fetch] trying: ${url}`);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      if (res.ok) {
        const html = await res.text();
        console.log(`[Wiki Fetch] got ${html.length} chars from ${url}`);
        return html;
      }
      console.log(`[Wiki Fetch] ${res.status} for ${url}`);
    } catch (err) {
      console.error(`[Wiki Fetch] error for ${url}:`, err);
    }
  }
  return "";
}

// Tier 1: Parse wiki HTML for profile image
function parseWikiForImage(html: string): string[] {
  // Look for infobox first (most reliable source of profile photo)
  const infoboxMatch = html.match(/<aside[^>]*class="[^"]*portable-infobox[^"]*"[^>]*>([\s\S]*?)<\/aside>/i);
  const searchArea = infoboxMatch ? infoboxMatch[1] : html.substring(0, 20000);

  const imageUrls = extractWikiaImageUrls(searchArea);

  // If no infobox images, try broader page
  if (imageUrls.length === 0) {
    return extractWikiaImageUrls(html).slice(0, 10);
  }
  return imageUrls;
}

// Tier 2: Firecrawl Search (optional)
async function firecrawlSearch(name: string, seasonNumber: number, apiKey: string): Promise<string | null> {
  const query = `Survivor Season ${seasonNumber} ${name} CBS official headshot photo`;
  console.log(`[Firecrawl] query: "${query}"`);
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 5 }),
    });
    if (!res.ok) {
      console.error(`[Firecrawl] API error ${res.status}`);
      return null;
    }
    const data = await res.json();
    const results = data.data || data.results || [];
    const urlPattern = /https?:\/\/[^\s"'<>\]\)]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s"'<>\]\)]*)?/gi;
    for (const r of results) {
      const text = [r.markdown, r.description, r.title, r.url].filter(Boolean).join(" ");
      const urls = [...new Set(text.match(urlPattern) || [])];
      for (const url of urls) {
        if (await validateImageUrl(url)) {
          console.log(`[Firecrawl] ✓ found: ${url}`);
          return url;
        }
      }
    }
    return null;
  } catch (err) {
    console.error("[Firecrawl] error:", err);
    return null;
  }
}

// Tier 3: AI-Assisted Parse using wiki HTML content
async function aiAssistedParse(name: string, seasonNumber: number, html: string, apiKey: string): Promise<string | null> {
  if (!html || html.length < 200) return null;
  console.log(`[AI Parse] trying for ${name}`);

  // Extract a focused snippet with image tags
  const imgTags = html.match(/<img[^>]+>/gi) || [];
  const relevantImgs = imgTags.filter((tag) => tag.includes("wikia.nocookie.net") || tag.includes("static.wikia")).slice(0, 20);
  const snippet = relevantImgs.join("\n");

  if (!snippet) return null;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Extract the profile/headshot image URL from these HTML img tags. Return ONLY the URL or NOT_FOUND.",
          },
          {
            role: "user",
            content: `Find the main profile photo URL for ${name} (Survivor ${seasonNumber}) from these img tags:\n\n${snippet}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    if (text.includes("NOT_FOUND")) return null;

    const urlPattern = /https?:\/\/[^\s"'<>\]\)]+\.(?:jpg|jpeg|png|webp)(?:\/[^\s"'<>\]\)]*)?/gi;
    const urls = text.match(urlPattern) || [];
    for (const url of urls) {
      if (await validateImageUrl(url)) {
        console.log(`[AI Parse] ✓ found: ${url}`);
        return url;
      }
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { season_number, contestant_ids, force_refresh = false }: FetchRequest = await req.json();

    if (!season_number) {
      return new Response(
        JSON.stringify({ success: false, error: "season_number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("master_contestants")
      .select("id, name, image_url")
      .eq("season_number", season_number);

    if (contestant_ids?.length) query = query.in("id", contestant_ids);
    if (!force_refresh) query = query.is("image_url", null);

    const { data: contestants, error: fetchError } = await query;

    if (fetchError) {
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!contestants?.length) {
      return new Response(
        JSON.stringify({ success: true, total: 0, found: 0, notFound: 0, results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    console.log(`[Config] FIRECRAWL_API_KEY: ${firecrawlKey ? "set" : "NOT SET"}`);
    console.log(`[Config] LOVABLE_API_KEY: ${lovableKey ? "set" : "NOT SET"}`);
    console.log(`Processing ${contestants.length} contestants for Season ${season_number}`);

    const results: ContestantResult[] = [];
    let foundCount = 0;

    for (const contestant of contestants) {
      console.log(`--- Processing: ${contestant.name} ---`);
      let imageUrl: string | null = null;

      // Fetch wiki HTML once (used by Tier 1 and Tier 3)
      const wikiHtml = await fetchWikiHtml(contestant.name, season_number);

      // Tier 1: Parse wiki HTML for profile image
      if (wikiHtml) {
        const candidates = parseWikiForImage(wikiHtml);
        console.log(`[Wiki Parse] ${candidates.length} candidate URLs found`);
        for (const rawUrl of candidates.slice(0, 5)) {
          const cleaned = cleanWikiaUrl(rawUrl);
          if (await validateImageUrl(cleaned)) {
            imageUrl = cleaned;
            console.log(`[Wiki Parse] ✓ valid: ${imageUrl}`);
            break;
          }
        }
      }

      // Tier 2: Firecrawl Search (optional)
      if (!imageUrl && firecrawlKey) {
        imageUrl = await firecrawlSearch(contestant.name, season_number, firecrawlKey);
        await new Promise((r) => setTimeout(r, 500));
      }

      // Tier 3: AI-Assisted Parse using the wiki HTML
      if (!imageUrl && lovableKey && wikiHtml) {
        imageUrl = await aiAssistedParse(contestant.name, season_number, wikiHtml, lovableKey);
      }

      if (imageUrl) {
        const { error: updateError } = await supabase
          .from("master_contestants")
          .update({ image_url: imageUrl })
          .eq("id", contestant.id);

        if (updateError) {
          results.push({ id: contestant.id, name: contestant.name, success: false, error: updateError.message });
        } else {
          results.push({ id: contestant.id, name: contestant.name, success: true, image_url: imageUrl });
          foundCount++;
        }
      } else {
        results.push({ id: contestant.id, name: contestant.name, success: false, error: "No image found" });
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    console.log(`Completed: ${foundCount} found, ${contestants.length - foundCount} not found`);

    return new Response(
      JSON.stringify({ success: true, total: contestants.length, found: foundCount, notFound: contestants.length - foundCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetch-cast-images:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
