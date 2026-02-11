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

// Filter out junk URLs (logos, icons, site-wide images)
function isJunkImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("site-logo") || lower.includes("favicon") || lower.includes("wiki-wordmark") ||
    lower.includes("community-header") || lower.includes("site-community") ||
    lower.includes("community-corner") || lower.includes("wiki.png") ||
    lower.includes("icon") && lower.includes("wiki");
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

// Extract image URLs from text/markdown content
function extractImageUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s"'<>\]\)]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s"'<>\]\)]*)?/gi;
  return [...new Set(text.match(urlPattern) || [])];
}

// Extract wikia CDN image URLs specifically, filtering out logos/icons
function extractWikiaImageUrls(text: string): string[] {
  const pattern = /https?:\/\/static\.wikia\.nocookie\.net\/[^\s"'<>\]\)]+\.(?:jpg|jpeg|png|webp)(?:\/revision\/[^\s"'<>\]\)]*)?/gi;
  const matches = text.match(pattern) || [];
  return [...new Set(matches)].filter((url) => {
    const lower = url.toLowerCase();
    // Skip site logos, icons, and tiny thumbnails
    if (lower.includes("site-logo") || lower.includes("favicon") || lower.includes("wiki-wordmark")) return false;
    if (lower.includes("community-header") || lower.includes("site-community")) return false;
    if (/\/scale-to-width-down\/\d{1,2}(?:$|\?|"|')/.test(url)) return false;
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

// Pick the best image URL, preferring official sources
function pickBestImageUrl(urls: string[]): string | null {
  const wikia = urls.find((u) => u.includes("static.wikia.nocookie.net"));
  const cbs = urls.find((u) => u.includes("cbs.com") || u.includes("paramount"));
  return cbs || wikia || urls[0] || null;
}

// Build wiki URL variants for a contestant name
function buildWikiUrls(name: string, seasonNumber: number): string[] {
  const cleanName = name.replace(/"/g, "").trim();
  const wikiName = cleanName.replace(/\s+/g, "_");
  
  const urls = [
    `https://survivor.fandom.com/wiki/${wikiName}_(Survivor_${seasonNumber})`,
    `https://survivor.fandom.com/wiki/${wikiName}`,
  ];

  // If name has a nickname in quotes like Benjamin "Coach" Wade, also try the nickname
  const nicknameMatch = name.match(/"([^"]+)"/);
  if (nicknameMatch) {
    const nickname = nicknameMatch[1];
    const lastName = cleanName.split(/\s+/).pop() || "";
    if (lastName) {
      urls.push(`https://survivor.fandom.com/wiki/${nickname}_${lastName}_(Survivor_${seasonNumber})`);
      urls.push(`https://survivor.fandom.com/wiki/${nickname}_${lastName}`);
    }
    urls.push(`https://survivor.fandom.com/wiki/${nickname}_(Survivor_${seasonNumber})`);
    urls.push(`https://survivor.fandom.com/wiki/${nickname}`);
  }

  // If name has a nickname like Quintavius "Q" Burdette, try without first name
  // Also try first + last without middle
  const parts = cleanName.split(/\s+/);
  if (parts.length >= 3) {
    const firstLast = `${parts[0]}_${parts[parts.length - 1]}`;
    urls.push(`https://survivor.fandom.com/wiki/${firstLast}_(Survivor_${seasonNumber})`);
    urls.push(`https://survivor.fandom.com/wiki/${firstLast}`);
  }

  // Deduplicate
  return [...new Set(urls)];
}

// Tier 1: Firecrawl Scrape of Survivor Wiki page
async function firecrawlScrapeWiki(name: string, seasonNumber: number, apiKey: string): Promise<string | null> {
  const urls = buildWikiUrls(name, seasonNumber);

  for (const url of urls) {
    console.log(`[Firecrawl Scrape] scraping: ${url}`);
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, formats: ["markdown", "html"] }),
      });

      if (!res.ok) {
        console.error(`[Firecrawl Scrape] API error ${res.status} for ${url}`);
        continue;
      }

      const data = await res.json();
      const markdown = data.data?.markdown || data.markdown || "";
      const html = data.data?.html || data.html || "";
      const combined = markdown + "\n" + html;
      console.log(`[Firecrawl Scrape] got ${markdown.length} chars markdown, ${html.length} chars html`);

      if (!combined || combined.length < 200) continue;

      // Extract wikia CDN images from combined content (HTML has actual src URLs)
      const wikiaUrls = extractWikiaImageUrls(combined).filter((u) => !isJunkImageUrl(u));
      console.log(`[Firecrawl Scrape] found ${wikiaUrls.length} wikia image URLs (filtered)`);

      for (const rawUrl of wikiaUrls.slice(0, 5)) {
        const cleaned = cleanWikiaUrl(rawUrl);
        if (await validateImageUrl(cleaned)) {
          console.log(`[Firecrawl Scrape] ✓ valid wikia image: ${cleaned}`);
          return cleaned;
        }
      }

      // Try all image URLs from the combined content (filtered)
      const allImageUrls = extractImageUrls(combined).filter((u) => !isJunkImageUrl(u));
      console.log(`[Firecrawl Scrape] found ${allImageUrls.length} total image URLs (filtered)`);

      const best = pickBestImageUrl(allImageUrls);
      if (best && await validateImageUrl(best)) {
        console.log(`[Firecrawl Scrape] ✓ valid image: ${best}`);
        return best;
      }

      // Try remaining URLs
      for (const imgUrl of allImageUrls.slice(0, 8)) {
        if (imgUrl !== best && await validateImageUrl(imgUrl)) {
          console.log(`[Firecrawl Scrape] ✓ fallback valid: ${imgUrl}`);
          return imgUrl;
        }
      }

      // Log the markdown for debugging if no images found
      console.log(`[Firecrawl Scrape] no valid images. First 500 chars: ${markdown.substring(0, 500)}`);

      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error("[Firecrawl Scrape] error:", err);
    }
  }

  return null;
}

// Tier 2: Firecrawl Search
async function firecrawlSearch(name: string, seasonNumber: number, apiKey: string): Promise<string | null> {
  const query = `Survivor Season ${seasonNumber} ${name} contestant photo`;
  console.log(`[Firecrawl Search] query: "${query}"`);
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
      console.error(`[Firecrawl Search] API error ${res.status}`);
      return null;
    }
    const data = await res.json();
    const results = data.data || data.results || [];
    const allUrls: string[] = [];
    for (const r of results) {
      const text = [r.markdown, r.description, r.title, r.url].filter(Boolean).join(" ");
      allUrls.push(...extractImageUrls(text));
    }
    const best = pickBestImageUrl([...new Set(allUrls)]);
    if (best && await validateImageUrl(best)) {
      console.log(`[Firecrawl Search] ✓ found: ${best}`);
      return best;
    }
    for (const url of [...new Set(allUrls)]) {
      if (url !== best && await validateImageUrl(url)) {
        console.log(`[Firecrawl Search] ✓ fallback: ${url}`);
        return url;
      }
    }
    return null;
  } catch (err) {
    console.error("[Firecrawl Search] error:", err);
    return null;
  }
}

// Tier 3: AI-Assisted (uses Lovable AI to help parse content)
async function aiAssistedFind(name: string, seasonNumber: number, apiKey: string): Promise<string | null> {
  console.log(`[AI Find] trying for ${name}`);
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
            content: "You are an expert at finding Survivor contestant headshot image URLs. Return ONLY the direct image URL (from static.wikia.nocookie.net, cbs.com, or similar official sources) or the word NOT_FOUND. No explanations.",
          },
          {
            role: "user",
            content: `What is the direct image URL for the Survivor Wiki profile photo of ${name} from Survivor Season ${seasonNumber}? The wiki page would be at https://survivor.fandom.com/wiki/${name.replace(/"/g, "").replace(/\s+/g, "_")}. Return ONLY the URL or NOT_FOUND.`,
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
    const urls = extractImageUrls(text);
    for (const url of urls) {
      if (await validateImageUrl(url)) {
        console.log(`[AI Find] ✓ found: ${url}`);
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

    if (!firecrawlKey) {
      console.error("FIRECRAWL_API_KEY is required for image fetching");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl API key not configured. Please link the Firecrawl connector." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: ContestantResult[] = [];
    let foundCount = 0;

    for (const contestant of contestants) {
      console.log(`--- Processing: ${contestant.name} ---`);
      let imageUrl: string | null = null;

      // Tier 1: Firecrawl Scrape of wiki page (bypasses 403)
      imageUrl = await firecrawlScrapeWiki(contestant.name, season_number, firecrawlKey);

      // Tier 2: Firecrawl Search
      if (!imageUrl) {
        await new Promise((r) => setTimeout(r, 500));
        imageUrl = await firecrawlSearch(contestant.name, season_number, firecrawlKey);
      }

      // Tier 3: AI-Assisted
      if (!imageUrl && lovableKey) {
        imageUrl = await aiAssistedFind(contestant.name, season_number, lovableKey);
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
