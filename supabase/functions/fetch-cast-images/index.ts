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
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImageValidator/1.0)",
      }
    });
    if (!response.ok) return false;
    
    const contentType = response.headers.get("content-type") || "";
    return contentType.startsWith("image/") || 
           url.endsWith(".jpg") || 
           url.endsWith(".jpeg") || 
           url.endsWith(".png") ||
           url.endsWith(".webp");
  } catch {
    return false;
  }
}

// Generate possible Survivor Wiki image URLs for a contestant
function generateWikiImageUrls(name: string, seasonNumber: number): string[] {
  // Clean the name for URL encoding
  const cleanName = name
    .replace(/"/g, "") // Remove quotes
    .replace(/['']/g, "'") // Normalize apostrophes
    .split(" ")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("_");

  // First and last name only version
  const nameParts = name.replace(/"/g, "").replace(/['']/g, "'").split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  const shortName = `${firstName}_${lastName}`;
  
  // Generate variations of image URLs based on Survivor Wiki patterns
  const baseUrls = [
    // Current season pattern
    `https://static.wikia.nocookie.net/survivor/images/${cleanName}_S${seasonNumber}.jpg`,
    `https://static.wikia.nocookie.net/survivor/images/${cleanName}.jpg`,
    // With first-last name only
    `https://static.wikia.nocookie.net/survivor/images/${shortName}.jpg`,
    // Returning player patterns with season
    `https://static.wikia.nocookie.net/survivor/images/${firstName}_${seasonNumber}.jpg`,
  ];

  return baseUrls;
}

// Extract image URL from AI response
function extractImageUrl(text: string): string | null {
  // Look for URLs ending in common image extensions
  const urlPattern = /https?:\/\/[^\s"'<>\]\)]+\.(?:jpg|jpeg|png|gif|webp)(?:[?][^\s"'<>\]\)]*)?/gi;
  const matches = text.match(urlPattern);
  
  if (matches && matches.length > 0) {
    // Prefer CBS or Wikia sources
    const preferredMatch = matches.find(
      (url) =>
        url.includes("cbs.com") ||
        url.includes("wikia.nocookie.net") ||
        url.includes("static.wikia.nocookie.net") ||
        url.includes("wwwimage") ||
        url.includes("paramount")
    );
    return preferredMatch || matches[0];
  }
  
  return null;
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch contestants
    let query = supabase
      .from("master_contestants")
      .select("id, name, image_url")
      .eq("season_number", season_number);

    if (contestant_ids && contestant_ids.length > 0) {
      query = query.in("id", contestant_ids);
    }

    if (!force_refresh) {
      query = query.is("image_url", null);
    }

    const { data: contestants, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching contestants:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!contestants || contestants.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          total: 0,
          found: 0,
          notFound: 0,
          results: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${contestants.length} contestants for Season ${season_number}`);

    const results: ContestantResult[] = [];
    let foundCount = 0;
    let notFoundCount = 0;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each contestant
    for (const contestant of contestants) {
      console.log(`Searching for image: ${contestant.name}`);

      try {
        // First, try the AI approach to find the image URL
        const searchPrompt = `I need to find the official CBS headshot image URL for this Survivor contestant:
- Name: ${contestant.name}
- Season: Survivor ${season_number}

Please search for and provide the direct image URL for their official CBS press photo or Survivor Wiki profile image.
The URL should end in .jpg, .png, or similar image extension.
Preferred sources in order: 
1. CBS.com or Paramount press images
2. static.wikia.nocookie.net (Survivor Wiki)
3. Other official sources

If you find a valid image URL, respond with ONLY the URL on a single line, nothing else.
If you cannot find an image, respond with exactly: NOT_FOUND`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that finds Survivor contestant headshot images. You have knowledge of Survivor cast photos and common image hosting locations. Return only the direct image URL or NOT_FOUND.",
              },
              {
                role: "user",
                content: searchPrompt,
              },
            ],
            max_tokens: 300,
            temperature: 0.1,
          }),
        });

        let imageUrl: string | null = null;

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const responseText = aiData.choices?.[0]?.message?.content?.trim() || "";

          console.log(`AI response for ${contestant.name}:`, responseText.substring(0, 200));

          if (!responseText.includes("NOT_FOUND") && responseText) {
            // Extract image URL from response
            imageUrl = extractImageUrl(responseText);
            
            if (imageUrl) {
              // Validate the URL
              const isValid = await validateImageUrl(imageUrl);
              if (!isValid) {
                console.log(`Invalid image URL for ${contestant.name}: ${imageUrl}`);
                imageUrl = null;
              }
            }
          }
        } else {
          console.error(`AI API error for ${contestant.name}:`, aiResponse.status);
        }

        // If AI didn't find a valid URL, try known URL patterns
        if (!imageUrl) {
          console.log(`Trying URL patterns for ${contestant.name}`);
          const possibleUrls = generateWikiImageUrls(contestant.name, season_number);
          
          for (const url of possibleUrls) {
            const isValid = await validateImageUrl(url);
            if (isValid) {
              imageUrl = url;
              console.log(`Found valid URL via pattern: ${url}`);
              break;
            }
          }
        }

        if (!imageUrl) {
          console.log(`No image found for ${contestant.name}`);
          results.push({
            id: contestant.id,
            name: contestant.name,
            success: false,
            error: "No image found",
          });
          notFoundCount++;
          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }

        // Update the database
        const { error: updateError } = await supabase
          .from("master_contestants")
          .update({ image_url: imageUrl })
          .eq("id", contestant.id);

        if (updateError) {
          console.error(`Failed to update ${contestant.name}:`, updateError);
          results.push({
            id: contestant.id,
            name: contestant.name,
            success: false,
            error: updateError.message,
          });
          notFoundCount++;
        } else {
          console.log(`Updated image for ${contestant.name}: ${imageUrl}`);
          results.push({
            id: contestant.id,
            name: contestant.name,
            success: true,
            image_url: imageUrl,
          });
          foundCount++;
        }

        // Rate limiting: 300ms delay between requests
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error processing ${contestant.name}:`, error);
        results.push({
          id: contestant.id,
          name: contestant.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        notFoundCount++;
      }
    }

    console.log(`Completed: ${foundCount} found, ${notFoundCount} not found`);

    return new Response(
      JSON.stringify({
        success: true,
        total: contestants.length,
        found: foundCount,
        notFound: notFoundCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetch-cast-images:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
