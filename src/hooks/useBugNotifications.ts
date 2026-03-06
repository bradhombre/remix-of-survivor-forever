import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BugResponse {
  id: string;
  description: string;
  admin_notes: string;
  status: string;
}

export function useBugNotifications(userId: string | undefined) {
  const [unreadResponses, setUnreadResponses] = useState<BugResponse[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("bug_reports")
        .select("id, description, admin_notes, status, user_viewed_response")
        .eq("user_id", userId)
        .not("admin_notes", "is", null)
        .eq("user_viewed_response", false);

      setUnreadResponses(
        (data || []).map((d: any) => ({
          id: d.id,
          description: d.description,
          admin_notes: d.admin_notes,
          status: d.status,
        }))
      );
    };
    fetch();
  }, [userId]);

  const markAsViewed = async (ids: string[]) => {
    if (!ids.length) return;
    await supabase
      .from("bug_reports")
      .update({ user_viewed_response: true } as any)
      .in("id", ids);
    setUnreadResponses([]);
  };

  return { unreadResponses, markAsViewed };
}
