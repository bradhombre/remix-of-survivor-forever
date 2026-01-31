import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Loader2 } from "lucide-react";

interface SeasonCompleteBannerProps {
  season: number;
  isLeagueAdmin: boolean;
  onStartNewSeason: () => Promise<void>;
}

export const SeasonCompleteBanner = ({
  season,
  isLeagueAdmin,
  onStartNewSeason,
}: SeasonCompleteBannerProps) => {
  const [isStarting, setIsStarting] = useState(false);

  const handleStartNewSeason = async () => {
    setIsStarting(true);
    try {
      await onStartNewSeason();
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20 border-b border-accent/30">
      <div className="container max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-accent" />
            <div>
              <p className="font-semibold text-foreground">
                Season {season} Complete!
              </p>
              <p className="text-sm text-muted-foreground">
                Ready for the next adventure?
              </p>
            </div>
          </div>
          
          {isLeagueAdmin && (
            <Button
              onClick={handleStartNewSeason}
              disabled={isStarting}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Start Season {season + 1}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
