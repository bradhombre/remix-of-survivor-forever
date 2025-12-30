import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type LeagueRole = "league_admin" | "player" | "super_admin" | null;

interface UseLeagueRoleResult {
  role: LeagueRole;
  isLeagueAdmin: boolean;
  loading: boolean;
}

export function useLeagueRole(leagueId: string | undefined): UseLeagueRoleResult {
  const [role, setRole] = useState<LeagueRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!leagueId) {
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check for league membership role
      const { data: membership } = await supabase
        .from("league_memberships")
        .select("role")
        .eq("league_id", leagueId)
        .eq("user_id", user.id)
        .single();

      if (membership) {
        setRole(membership.role as LeagueRole);
      } else {
        // Check for super_admin (league_id is null for super_admin entries)
        const { data: superAdmin } = await supabase
          .from("league_memberships")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .is("league_id", null)
          .single();

        if (superAdmin) {
          setRole("super_admin");
        }
      }

      setLoading(false);
    };

    fetchRole();
  }, [leagueId]);

  return {
    role,
    isLeagueAdmin: role === "league_admin" || role === "super_admin",
    loading,
  };
}
