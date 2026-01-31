import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  league_id: string;
  user_id: string;
  content: string;
  is_bot: boolean;
  reactions: Record<string, string[]>;
  created_at: string;
  user_email?: string;
  user_display_name?: string;
}

interface UseChatMessagesOptions {
  leagueId: string | undefined;
  userId: string | undefined;
}

export function useChatMessages({ leagueId, userId }: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isJeffBotTyping, setIsJeffBotTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastReadRef = useRef<string | null>(null);

  // Fetch initial messages
  useEffect(() => {
    if (!leagueId) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("league_id", leagueId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        // Fetch user profiles for messages
        const userIds = [...new Set((data || []).filter(m => !m.is_bot).map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, display_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, { email: p.email, display_name: p.display_name }]) || []);
        
        const messagesWithEmails = (data || []).map(msg => {
          const profile = profileMap.get(msg.user_id);
          return {
            ...msg,
            reactions: (msg.reactions as Record<string, string[]>) || {},
            user_email: msg.is_bot ? "JeffBot" : profile?.email || "Unknown",
            user_display_name: msg.is_bot ? "JeffBot 🏝️" : undefined,
          };
        });
        
        // Calculate display name using helper function
        const messagesWithDisplayNames = messagesWithEmails.map(msg => {
          if (msg.is_bot) {
            return { ...msg, user_display_name: "JeffBot 🏝️" };
          }
          const profile = profileMap.get(msg.user_id);
          const displayName = profile?.display_name?.trim();
          return {
            ...msg,
            user_display_name: displayName || msg.user_email?.split("@")[0] || "Unknown",
          };
        });
        
        setMessages(messagesWithDisplayNames);
        if (messagesWithDisplayNames.length > 0) {
          lastReadRef.current = messagesWithDisplayNames[messagesWithDisplayNames.length - 1].id;
        }
      }
      setLoading(false);
    };

    fetchMessages();
  }, [leagueId]);

  // Real-time subscription
  useEffect(() => {
    if (!leagueId) return;

    channelRef.current = supabase
      .channel(`chat-${leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `league_id=eq.${leagueId}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Fetch user profile for the new message
          let displayName = "JeffBot 🏝️";
          let userEmail = "JeffBot";
          if (!newMessage.is_bot) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, display_name")
              .eq("id", newMessage.user_id)
              .single();
            userEmail = profile?.email || "Unknown";
            displayName = profile?.display_name?.trim() || userEmail.split("@")[0];
          }

          setMessages((prev) => {
            // Check if message already exists
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, { 
              ...newMessage, 
              reactions: (newMessage.reactions as Record<string, string[]>) || {},
              user_email: userEmail,
              user_display_name: displayName,
            }];
          });

          // If it's a bot message, stop typing indicator
          if (newMessage.is_bot) {
            setIsJeffBotTyping(false);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `league_id=eq.${leagueId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMessage.id
                ? { ...m, reactions: (updatedMessage.reactions as Record<string, string[]>) || {} }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [leagueId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!leagueId || !userId || !content.trim() || isSending) return;

      const trimmedContent = content.trim().slice(0, 500);
      const isJeffBotQuery = trimmedContent.toLowerCase().startsWith("@jeffbot");

      setIsSending(true);

      try {
        // Insert user message
        const { error } = await supabase.from("chat_messages").insert({
          league_id: leagueId,
          user_id: userId,
          content: trimmedContent,
          is_bot: false,
        });

        if (error) throw error;

        // If it's a JeffBot query, call the edge function
        if (isJeffBotQuery) {
          setIsJeffBotTyping(true);
          const question = trimmedContent.slice(8).trim(); // Remove @jeffbot prefix
          
          const { error: funcError } = await supabase.functions.invoke("jeffbot", {
            body: { league_id: leagueId, user_id: userId, question },
          });

          if (funcError) {
            console.error("JeffBot error:", funcError);
            setIsJeffBotTyping(false);
            throw new Error("JeffBot is taking a break, try again");
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setIsJeffBotTyping(false);
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [leagueId, userId, isSending]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!userId) return;

      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      const currentReactions = message.reactions || {};
      const emojiReactions = currentReactions[emoji] || [];
      const hasReacted = emojiReactions.includes(userId);

      const newEmojiReactions = hasReacted
        ? emojiReactions.filter((id) => id !== userId)
        : [...emojiReactions, userId];

      const newReactions = {
        ...currentReactions,
        [emoji]: newEmojiReactions,
      };

      // Remove empty arrays
      if (newEmojiReactions.length === 0) {
        delete newReactions[emoji];
      }

      const { error } = await supabase
        .from("chat_messages")
        .update({ reactions: newReactions })
        .eq("id", messageId);

      if (error) {
        console.error("Error updating reaction:", error);
      }
    },
    [messages, userId]
  );

  const getUnreadCount = useCallback(() => {
    if (!lastReadRef.current) return messages.length;
    const lastReadIndex = messages.findIndex((m) => m.id === lastReadRef.current);
    if (lastReadIndex === -1) return messages.length;
    return messages.length - lastReadIndex - 1;
  }, [messages]);

  const markAllRead = useCallback(() => {
    if (messages.length > 0) {
      lastReadRef.current = messages[messages.length - 1].id;
    }
  }, [messages]);

  return {
    messages,
    loading,
    isSending,
    isJeffBotTyping,
    sendMessage,
    toggleReaction,
    getUnreadCount,
    markAllRead,
  };
}
