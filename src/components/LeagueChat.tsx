import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatMentionInput, MentionableUser } from "@/components/ChatMentionInput";
import { OnlineUsersPopover } from "@/components/OnlineUsersPopover";
import { useChatMessages, ChatMessage as ChatMessageType } from "@/hooks/useChatMessages";
import { useChatPresence } from "@/hooks/useChatPresence";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDisplayName } from "@/lib/displayNameUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isToday, isSameDay } from "date-fns";

interface LeagueTeam {
  id: string;
  name: string;
  user_id: string | null;
}

interface LeagueChatProps {
  leagueId: string | undefined;
  userId: string | undefined;
  userEmail: string | undefined;
  userTeamName: string | undefined;
  teams: LeagueTeam[];
}

const STORAGE_KEY = "league-chat-expanded";
const RATE_LIMIT_MS = 2000;

export function LeagueChat({ leagueId, userId, userEmail, userTeamName, teams }: LeagueChatProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [inputValue, setInputValue] = useState("");
  const [canSend, setCanSend] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isExpandedRef = useRef(isExpanded);
  const isMobile = useIsMobile();

  // Keep ref in sync
  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  // Use team name, fall back to email username
  const currentUserDisplayName = userTeamName || (userEmail ? getDisplayName(null, userEmail) : undefined);

  // Handle new message notifications
  const handleNewMessage = useCallback((message: ChatMessageType) => {
    // Only show notification if chat is collapsed
    if (!isExpandedRef.current) {
      const senderName = message.user_display_name || "Someone";
      const preview = message.content.length > 50 
        ? message.content.slice(0, 50) + "..." 
        : message.content;
      
      toast(
        <div className="cursor-pointer" onClick={() => setIsExpanded(true)}>
          <div className="font-medium">{senderName}</div>
          <div className="text-sm text-muted-foreground truncate">{preview}</div>
        </div>,
        { duration: 5000 }
      );
    }
  }, []);

  const {
    messages,
    loading,
    isSending,
    isJeffBotTyping,
    sendMessage,
    toggleReaction,
    getUnreadCount,
    markAllRead,
  } = useChatMessages({ leagueId, userId, onNewMessage: handleNewMessage });

  const { onlineUsers, othersOnline } = useChatPresence({ 
    leagueId, 
    userId, 
    userDisplayName: currentUserDisplayName 
  });

  // Build mentionable users list - include all claimed teams (including self)
  const mentionableUsers: MentionableUser[] = [
    { id: "jeffbot", name: "JeffBot 🏝️", isBot: true, isOnline: true },
    ...teams
      .filter(t => t.user_id) // Include all claimed teams
      .map(t => ({
        id: t.user_id!,
        name: t.name,
        isBot: false,
        isOnline: onlineUsers.some(ou => ou.user_id === t.user_id),
      })),
  ];

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isExpanded));
    if (isExpanded) {
      markAllRead();
      // Focus input when expanded
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded, markAllRead]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded, isJeffBotTyping]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !canSend || isSending) return;

    const content = inputValue;
    setInputValue("");
    setCanSend(false);

    try {
      await sendMessage(content);
    } catch (error) {
      if (error instanceof Error && error.message.includes("JeffBot")) {
        toast.error("JeffBot is taking a break, try again");
      } else {
        toast.error("Failed to send message");
      }
    }

    setTimeout(() => setCanSend(true), RATE_LIMIT_MS);
  }, [inputValue, canSend, isSending, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const unreadCount = isExpanded ? 0 : getUnreadCount();
  const charCount = inputValue.length;
  const isOverLimit = charCount > 500;

  // Determine which messages need date separators
  const messagesWithSeparators = messages.map((msg, idx) => {
    if (idx === 0) return { ...msg, showDateSeparator: true };
    const prevDate = new Date(messages[idx - 1].created_at);
    const currDate = new Date(msg.created_at);
    return { ...msg, showDateSeparator: !isSameDay(prevDate, currDate) };
  });

  if (!leagueId || !userId) return null;

  return (
    <div
      className={cn(
        "fixed z-50 transition-all duration-300",
        isExpanded
          ? isMobile
            ? "bottom-4 right-2 left-2"
            : "bottom-4 right-4 w-[350px]"
          : "bottom-4 right-4"
      )}
    >
      {/* Collapsed FAB */}
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg relative"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      )}

      {/* Expanded Chat Panel */}
      {isExpanded && (
        <div
          className={cn(
            "bg-background border border-border rounded-lg shadow-xl flex flex-col",
            isMobile ? "h-[70vh]" : "h-[450px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <span className="font-semibold">League Chat</span>
              {onlineUsers.length > 0 && (
                <OnlineUsersPopover onlineUsers={onlineUsers} currentUserId={userId}>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">
                      {onlineUsers.length} online
                    </span>
                  </div>
                </OnlineUsersPopover>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">
                  Try @jeffbot followed by a Survivor question!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {messagesWithSeparators.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    id={msg.id}
                    content={msg.content}
                    isBot={msg.is_bot}
                    displayName={msg.user_display_name || msg.user_email?.split("@")[0] || "Unknown"}
                    createdAt={msg.created_at}
                    reactions={msg.reactions}
                    currentUserId={userId}
                    onToggleReaction={toggleReaction}
                    showDateSeparator={msg.showDateSeparator}
                  />
                ))}
                
                {/* JeffBot typing indicator */}
                {isJeffBotTyping && (
                  <div className="px-3 py-2 rounded-lg bg-accent/50 border border-accent max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-accent-foreground">
                        JeffBot 🏝️
                      </span>
                      <span className="text-xs text-muted-foreground">is typing...</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <ChatMentionInput
                  inputRef={inputRef}
                  value={inputValue}
                  onChange={setInputValue}
                  onKeyDown={handleKeyDown}
                  placeholder="Message or @jeffbot question..."
                  maxLength={500}
                  disabled={isSending}
                  mentionableUsers={mentionableUsers}
                />
                {charCount > 400 && (
                  <span
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2 text-xs",
                      isOverLimit ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {charCount}/500
                  </span>
                )}
              </div>
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isOverLimit || !canSend || isSending}
                size="icon"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
