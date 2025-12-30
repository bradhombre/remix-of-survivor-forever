import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseIsSuperAdminResult {
  isSuperAdmin: boolean;
  loading: boolean;
}

export function useIsSuperAdmin(): UseIsSuperAdminResult {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("league_memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .is("league_id", null)
        .maybeSingle();

      setIsSuperAdmin(!!data);
      setLoading(false);
    };

    checkSuperAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSuperAdmin();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isSuperAdmin, loading };
}
