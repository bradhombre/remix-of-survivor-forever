import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getProxiedImageUrl } from '@/lib/imageProxy';

interface ContestantAvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'xs' | 'sm' | 'md';
  isEliminated?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
};

export function ContestantAvatar({
  name,
  imageUrl,
  size = 'sm',
  isEliminated = false,
  className,
}: ContestantAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const proxiedUrl = getProxiedImageUrl(imageUrl);

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        isEliminated && 'grayscale opacity-50',
        className
      )}
    >
      {proxiedUrl && <AvatarImage src={proxiedUrl} alt={name} />}
      <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
