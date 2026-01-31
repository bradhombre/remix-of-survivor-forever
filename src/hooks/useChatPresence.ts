import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceUser {
  user_id: string;
  display_name: string;
}

interface UseChatPresenceOptions {
  leagueId: string | undefined;
  userId: string | undefined;
  userDisplayName: string | undefined;
}

export function useChatPresence({ leagueId, userId, userDisplayName }: UseChatPresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!leagueId || !userId || !userDisplayName) return;

    channelRef.current = supabase.channel(`presence-${leagueId}`)
      .on("presence", { event: "sync" }, () => {
        const state = channelRef.current?.presenceState() || {};
        const users: PresenceUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (!users.some(u => u.user_id === presence.user_id)) {
              users.push({
                user_id: presence.user_id,
                display_name: presence.display_name,
              });
            }
          });
        });

        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channelRef.current?.track({
            user_id: userId,
            display_name: userDisplayName,
          });
        }
      });

    // Update presence on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && channelRef.current) {
        channelRef.current.track({
          user_id: userId,
          display_name: userDisplayName,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [leagueId, userId, userDisplayName]);

  const onlineCount = onlineUsers.length;
  const othersOnline = onlineUsers.filter(u => u.user_id !== userId).length;

  return {
    onlineUsers,
    onlineCount,
    othersOnline,
  };
}
