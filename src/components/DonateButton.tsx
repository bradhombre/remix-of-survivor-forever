import { useAppSettings } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export function DonateButton() {
  const { settings, loading } = useAppSettings();
  const donateUrl = settings['donate_url'];

  if (loading || !donateUrl) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground gap-2"
      asChild
    >
      <a href={donateUrl} target="_blank" rel="noopener noreferrer">
        <Heart className="h-4 w-4" />
        Buy Me a Coffee ☕
      </a>
    </Button>
  );
}
