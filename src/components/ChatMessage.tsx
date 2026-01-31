import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { ThumbsUp, Flame, Laugh } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  id: string;
  content: string;
  isBot: boolean;
  userEmail: string;
  createdAt: string;
  reactions: Record<string, string[]>;
  currentUserId: string | undefined;
  onToggleReaction: (messageId: string, emoji: string) => void;
  showDateSeparator?: boolean;
}

const REACTION_EMOJIS = [
  { key: "thumbsUp", icon: ThumbsUp, label: "👍" },
  { key: "fire", icon: Flame, label: "🔥" },
  { key: "laugh", icon: Laugh, label: "😂" },
];

export function ChatMessage({
  id,
  content,
  isBot,
  userEmail,
  createdAt,
  reactions,
  currentUserId,
  onToggleReaction,
  showDateSeparator,
}: ChatMessageProps) {
  const date = new Date(createdAt);
  const timeStr = format(date, "h:mm a");
  
  const getDateLabel = () => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  const displayName = isBot ? "JeffBot 🏝️" : userEmail.split("@")[0];

  return (
    <>
      {showDateSeparator && (
        <div className="flex items-center gap-2 my-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground px-2">{getDateLabel()}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}
      
      <div
        className={cn(
          "group px-3 py-2 rounded-lg max-w-[85%]",
          isBot
            ? "bg-accent/50 border border-accent ml-0 mr-auto"
            : "bg-muted ml-auto mr-0"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-xs font-medium",
            isBot ? "text-accent-foreground" : "text-foreground"
          )}>
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground">{timeStr}</span>
        </div>
        
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {content}
        </p>

        {/* Reactions */}
        <div className="flex items-center gap-1 mt-2">
          {REACTION_EMOJIS.map(({ key, icon: Icon, label }) => {
            const reactionUsers = reactions[key] || [];
            const hasReacted = currentUserId && reactionUsers.includes(currentUserId);
            const count = reactionUsers.length;

            return (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                onClick={() => onToggleReaction(id, key)}
                className={cn(
                  "h-6 px-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity",
                  count > 0 && "opacity-100",
                  hasReacted && "bg-accent text-accent-foreground"
                )}
              >
                <Icon className="h-3 w-3 mr-0.5" />
                {count > 0 && <span>{count}</span>}
              </Button>
            );
          })}
        </div>
      </div>
    </>
  );
}
