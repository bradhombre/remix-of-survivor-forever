import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getAvatarTheme, getInitials } from '@/lib/avatarUtils';

interface TeamAvatarProps {
  teamName: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  useIcon?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-20 w-20 text-2xl',
};

export function TeamAvatar({ 
  teamName, 
  avatarUrl, 
  size = 'md', 
  useIcon = false,
  className 
}: TeamAvatarProps) {
  const theme = getAvatarTheme(teamName);
  const content = useIcon ? theme.icon : getInitials(teamName);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={teamName} />}
      <AvatarFallback 
        className={cn(
          `bg-gradient-to-br ${theme.bg} text-white font-semibold`,
          // Only show fallback styling when there's no image
          !avatarUrl && 'flex'
        )}
      >
        {content}
      </AvatarFallback>
    </Avatar>
  );
}
