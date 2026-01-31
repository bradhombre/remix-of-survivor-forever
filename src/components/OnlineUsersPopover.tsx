import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface OnlineUser {
  user_id: string;
  display_name: string;
}

interface OnlineUsersPopoverProps {
  onlineUsers: OnlineUser[];
  currentUserId: string | undefined;
  children: React.ReactNode;
}

export function OnlineUsersPopover({
  onlineUsers,
  currentUserId,
  children,
}: OnlineUsersPopoverProps) {
  if (onlineUsers.length === 0) {
    return <>{children}</>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Online Now
        </div>
        <div className="space-y-1">
          {onlineUsers.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center gap-2 py-1 px-1 rounded text-sm"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="truncate">
                {user.display_name}
                {user.user_id === currentUserId && (
                  <span className="text-muted-foreground ml-1">(you)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
