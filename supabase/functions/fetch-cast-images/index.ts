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
  cast_page_url?: string;
}

interface ContestantResult {
  id: string;
  name: string;
  success: boolean;
  image_url?: string;
  error?: string;
}

interface CastMapping {
  name: string;
  image_url: string;
}

// --- Utility Functions ---

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

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
}

function namesMatch(dbName: string, extractedName: string): boolean {
  const a = normalizeName(dbName);
  const b = normalizeName(extractedName);
  if (a === b) return true;

  const aParts = a.split(" ");
  const bParts = b.split(" ");
  const aLast = aParts[aParts.length - 1];
  const bLast = bParts[bParts.length - 1];

  if (aLast === bLast && aParts[0]?.[0] === bParts[0]?.[0]) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (aLast === bLast) return true;

  return false;
}

// Clean a wikia image URL to get a 400px version
function cleanWikiaUrl(url: string): string {
  // Strip any existing /revision/... suffix and add our own
  const baseMatch = url.match(/^(https?:\/\/static\.wikia\.nocookie\.net\/[^/]+\/images\/[^/]+\/[^/]+\/[^/]+)/);
  if (baseMatch) {
    return baseMatch[1] + "/revision/latest/scale-to-width-down/400";
  }
  return url;
}

// --- Direct HTML parsing of wiki season page ---
// The Castaways table has rows like:
// <a href="/wiki/Name"><img src="..." /></a> ... <a href="/wiki/Name">Name</a>
// Each row has a thumbnail image (S50_firstname_t) and the contestant's name as a link

function extractCastFromHTML(html: string): CastMapping[] {
  const mappings: CastMapping[] = [];

  // Pattern: Find contestant images in the castaway table
  // Wiki uses format: alt="S50 firstname t" for Season 50 thumbnails
  // Each row has: <img ... src="wikia_url" ... alt="S50 name t"> followed by <a ...>Full Name</a>

  // Strategy: Find all wikia image URLs that match S50 contestant pattern
  // Then find the associated name from the nearby link

  // Look for rows that contain both an image and a contestant name link
  // The castaway table pattern: image link -> name link with bold
  const rowPattern = /<a[^>]*href="\/wiki\/([^"]+)"[^>]*>\s*<img[^>]*src="([^"]+static\.wikia\.nocookie\.net[^"]+)"[^>]*>\s*<\/a>\s*[\s\S]*?<a[^>]*href="\/wiki\/\1"[^>]*>\s*<b>([^<]+)<\/b>/gi;

  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const imageUrl = match[2];
    const name = match[3].trim();

    // Skip non-contestant images (logos, icons)
    if (imageUrl.includes("logo") || imageUrl.includes("icon") || imageUrl.includes("favicon")) continue;

    const cleaned = cleanWikiaUrl(imageUrl);
    mappings.push({ name, image_url: cleaned });
  }

  if (mappings.length > 0) {
    console.log(`[HTML Parse] Found ${mappings.length} contestants via row pattern`);
    return mappings;
  }

  // Fallback: simpler pattern - find S50_*_t images and extract names from alt text
  const imgPattern = /src="(https?:\/\/static\.wikia\.nocookie\.net\/[^"]+)"[^>]*alt="S\d+\s+(\w+)\s+t"/gi;
  const nameImgMap = new Map<string, string>();

  while ((match = imgPattern.exec(html)) !== null) {
    const url = match[1];
    const firstName = match[2].toLowerCase();
    nameImgMap.set(firstName, cleanWikiaUrl(url));
  }

  // Now find full names from links
  const nameLinkPattern = /<a[^>]*href="\/wiki\/[^"]*"[^>]*title="([^"]+)"[^>]*>\s*<b>([^<]+)<\/b>/gi;
  while ((match = nameLinkPattern.exec(html)) !== null) {
    const fullName = match[2].trim();
    const firstName = fullName.split(/\s+/)[0].toLowerCase();
    const imgUrl = nameImgMap.get(firstName);
    if (imgUrl) {
      mappings.push({ name: fullName, image_url: imgUrl });
    }
  }

  console.log(`[HTML Parse] Found ${mappings.length} contestants via alt-text pattern`);
  return mappings;
}

// Even simpler fallback: extract from markdown
function extractCastFromMarkdown(markdown: string): CastMapping[] {
  const mappings: CastMapping[] = [];

  // In markdown, the castaway table has rows like:
  // | [![S50 name t](image_url)](wiki_link) | **[Full Name](wiki_link)** ...
  const rowPattern = /\|\s*\[!\[S\d+\s+\w+\s+t\]\(([^)]+)\)\]/g;
  const namePattern = /\*\*\[([^\]]+)\]\([^)]+\)\*\*/g;

  // Collect images and names separately, then zip them
  const images: string[] = [];
  const names: string[] = [];

  let match;
  while ((match = rowPattern.exec(markdown)) !== null) {
    const url = match[1];
    if (url.includes("static.wikia.nocookie.net")) {
      images.push(cleanWikiaUrl(url));
    }
  }

  while ((match = namePattern.exec(markdown)) !== null) {
    names.push(match[1].trim());
  }

  // The pattern alternates: each castaway row has one image and one bold name
  // But there might be extra bold names (non-contestants), so we match by position in the castaways section
  console.log(`[Markdown Parse] Found ${images.length} images, ${names.length} bold names`);

  // Simple zip - images and names should appear in order
  const count = Math.min(images.length, names.length);
  for (let i = 0; i < count; i++) {
    mappings.push({ name: names[i], image_url: images[i] });
  }

  return mappings;
}

// --- Main Handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      season_number,
      contestant_ids,
      force_refresh = false,
      cast_page_url,
    }: FetchRequest = await req.json();

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
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${contestants.length} contestants for Season ${season_number}`);

    // --- Scrape the wiki season page ---
    const wikiUrl = cast_page_url || `https://survivor.fandom.com/wiki/Survivor_${season_number}`;
    console.log(`Scraping wiki season page: ${wikiUrl}`);

    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: wikiUrl, formats: ["html", "markdown"] }),
    });

    let castMappings: CastMapping[] = [];

    if (scrapeRes.ok) {
      const scrapeData = await scrapeRes.json();
      const html = scrapeData.data?.html || scrapeData.html || "";
      const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
      console.log(`Got ${html.length} chars HTML, ${markdown.length} chars markdown`);

      // Try HTML parsing first
      castMappings = extractCastFromHTML(html);

      // Fall back to markdown parsing
      if (castMappings.length === 0) {
        console.log("HTML parsing found 0, trying markdown...");
        castMappings = extractCastFromMarkdown(markdown);
      }

      // If still nothing, try AI extraction as last resort
      if (castMappings.length === 0) {
        console.log("Direct parsing found 0, trying AI extraction...");
        const lovableKey = Deno.env.get("LOVABLE_API_KEY");
        if (lovableKey) {
          try {
            const content = html.length > 60000 ? html.substring(0, 60000) : html;
            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: `Extract Survivor contestant names and their profile image URLs from this wiki page. Look for the Castaways table. Each contestant has a thumbnail image from static.wikia.nocookie.net. Return ONLY a JSON array: [{"name":"Full Name","image_url":"https://..."}]`,
                  },
                  { role: "user", content: content },
                ],
                max_tokens: 4000,
                temperature: 0,
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const text = aiData.choices?.[0]?.message?.content?.trim() || "";
              const jsonMatch = text.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                castMappings = JSON.parse(jsonMatch[0]).filter((m: CastMapping) => m.name && m.image_url);
                console.log(`AI extraction found ${castMappings.length} contestants`);
              }
            }
          } catch (err) {
            console.error("AI extraction failed:", err);
          }
        }
      }
    } else {
      console.error(`Firecrawl scrape failed: ${scrapeRes.status}`);
    }

    console.log(`Total mappings found: ${castMappings.length}`);
    for (const m of castMappings.slice(0, 3)) {
      console.log(`  ${m.name} -> ${m.image_url.substring(0, 60)}...`);
    }

    // Match and update
    const results: ContestantResult[] = [];
    let foundCount = 0;

    // Validate URLs in parallel (batch of 5)
    for (const contestant of contestants) {
      const match = castMappings.find((m) => namesMatch(contestant.name, m.name));

      if (match) {
        const valid = await validateImageUrl(match.image_url);
        if (valid) {
          const { error: updateError } = await supabase
            .from("master_contestants")
            .update({ image_url: match.image_url })
            .eq("id", contestant.id);

          if (updateError) {
            results.push({ id: contestant.id, name: contestant.name, success: false, error: updateError.message });
          } else {
            results.push({ id: contestant.id, name: contestant.name, success: true, image_url: match.image_url });
            foundCount++;
            console.log(`✓ ${contestant.name}`);
          }
        } else {
          results.push({ id: contestant.id, name: contestant.name, success: false, error: "URL invalid" });
          console.log(`✗ ${contestant.name} - URL invalid`);
        }
      } else {
        results.push({ id: contestant.id, name: contestant.name, success: false, error: "No match" });
        console.log(`✗ ${contestant.name} - no match`);
      }
    }

    console.log(`Done: ${foundCount}/${contestants.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        total: contestants.length,
        found: foundCount,
        notFound: contestants.length - foundCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
