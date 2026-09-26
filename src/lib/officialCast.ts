import { supabase } from "@/integrations/supabase/client";

/**
 * Copy a season's official cast (master_contestants, managed in /admin > Cast)
 * into a league's session, with photos and tribes.
 *
 * Only runs on an empty session, so it never duplicates or overwrites a cast
 * a commissioner already set up. Returns how many castaways were added
 * (0 if the session already had a cast or no official cast exists yet).
 */
export async function importOfficialCast(sessionId: string, season: number): Promise<number> {
  const { count: existing, error: countError } = await supabase
    .from("contestants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (countError) throw countError;
  if (existing && existing > 0) return 0;

  const { data: masterCast, error } = await supabase
    .from("master_contestants")
    .select("name, tribe, age, occupation, image_url")
    .eq("season_number", season)
    .order("name");
  if (error) throw error;
  if (!masterCast || masterCast.length === 0) return 0;

  const { error: insertError } = await supabase.from("contestants").insert(
    masterCast.map((mc) => ({
      session_id: sessionId,
      name: mc.name,
      tribe: mc.tribe || null,
      age: mc.age || null,
      location: mc.occupation || null,
      image_url: mc.image_url || null,
    }))
  );
  if (insertError) throw insertError;

  return masterCast.length;
}
