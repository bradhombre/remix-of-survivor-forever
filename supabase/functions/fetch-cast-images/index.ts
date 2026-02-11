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
    return contentType.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp)$/i.test(url);
  } catch {
    return false;
  }
}

// Extract image URLs from text content
function extractImageUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s"'<>\]\)]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s"'<>\]\)]*)?/gi;
  return [...new Set(text.match(urlPattern) || [])];
}

// Pick the best image URL, preferring official sources
function pickBestImageUrl(urls: string[]): string | null {
  const dominated = ["cbs.com", "paramount", "wwwimage"];
  const preferred = ["static.wikia.nocookie.net", "wikia.nocookie.net"];
  const best = urls.find((u) => dominated.some((d) => u.includes(d))) ||
    urls.find((u) => preferred.some((p) => u.includes(p))) ||
    urls[0] || null;
  return best;
}

// Step 1: Firecrawl Search
async function firecrawlSearch(name: string, seasonNumber: number, apiKey: string): Promise<string | null> {
  const query = `Survivor Season ${seasonNumber} ${name} CBS official headshot photo`;
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
    if (allUrls.length === 0) return null;
    const best = pickBestImageUrl(allUrls);
    if (best && await validateImageUrl(best)) {
      console.log(`[Firecrawl Search] found valid: ${best}`);
      return best;
    }
    // Try validating others
    for (const url of allUrls) {
      if (url !== best && await validateImageUrl(url)) {
        console.log(`[Firecrawl Search] fallback valid: ${url}`);
        return url;
      }
    }
    return null;
  } catch (err) {
    console.error("[Firecrawl Search] error:", err);
    return null;
  }
}

// Step 2: Firecrawl Scrape of Survivor Wiki
async function firecrawlScrape(name: string, seasonNumber: number, apiKey: string): Promise<string | null> {
  const wikiName = name.replace(/"/g, "").replace(/\s+/g, "_");
  const urls = [
    `https://survivor.fandom.com/wiki/${wikiName}_(Survivor_${seasonNumber})`,
    `https://survivor.fandom.com/wiki/${wikiName}`,
  ];
  for (const url of urls) {
    console.log(`[Firecrawl Scrape] scraping: ${url}`);
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, formats: ["markdown"] }),
      });
      if (!res.ok) {
        console.error(`[Firecrawl Scrape] API error ${res.status} for ${url}`);
        continue;
      }
      const data = await res.json();
      const markdown = data.data?.markdown || data.markdown || "";
      const imageUrls = extractImageUrls(markdown).filter(
        (u) => u.includes("static.wikia.nocookie.net") || u.includes("wikia.nocookie.net")
      );
      if (imageUrls.length > 0) {
        const valid = imageUrls[0];
        if (await validateImageUrl(valid)) {
          console.log(`[Firecrawl Scrape] found valid: ${valid}`);
          return valid;
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error("[Firecrawl Scrape] error:", err);
    }
  }
  return null;
}

// Step 3: AI Fallback
async function aiFallback(name: string, seasonNumber: number, lovableApiKey: string): Promise<string | null> {
  console.log(`[AI Fallback] trying for ${name}`);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You find Survivor contestant headshot image URLs. Return ONLY the direct URL or NOT_FOUND." },
          { role: "user", content: `Find the official CBS headshot image URL for ${name} from Survivor Season ${seasonNumber}. Return ONLY the URL or NOT_FOUND.` },
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
      if (await validateImageUrl(url)) return url;
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

    if (!firecrawlKey) console.warn("FIRECRAWL_API_KEY not set - will use AI-only fallback");
    if (!lovableKey) console.warn("LOVABLE_API_KEY not set - AI fallback disabled");

    console.log(`Processing ${contestants.length} contestants for Season ${season_number}`);

    const results: ContestantResult[] = [];
    let foundCount = 0;

    for (const contestant of contestants) {
      console.log(`--- Processing: ${contestant.name} ---`);
      let imageUrl: string | null = null;

      // Tier 1: Firecrawl Search
      if (!imageUrl && firecrawlKey) {
        imageUrl = await firecrawlSearch(contestant.name, season_number, firecrawlKey);
        await new Promise((r) => setTimeout(r, 500));
      }

      // Tier 2: Firecrawl Scrape
      if (!imageUrl && firecrawlKey) {
        imageUrl = await firecrawlScrape(contestant.name, season_number, firecrawlKey);
        await new Promise((r) => setTimeout(r, 500));
      }

      // Tier 3: AI Fallback
      if (!imageUrl && lovableKey) {
        imageUrl = await aiFallback(contestant.name, season_number, lovableKey);
        await new Promise((r) => setTimeout(r, 300));
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
