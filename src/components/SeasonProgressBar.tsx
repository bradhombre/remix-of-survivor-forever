import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Contestant } from "@/types/survivor";
import { Users, Tv } from "lucide-react";

interface SeasonProgressBarProps {
  episode: number;
  totalEpisodes?: number;
  isPostMerge: boolean;
  contestants: Contestant[];
}

export function SeasonProgressBar({
  episode,
  totalEpisodes = 13,
  isPostMerge,
  contestants,
}: SeasonProgressBarProps) {
  const remaining = contestants.filter((c) => !c.isEliminated).length;
  const total = contestants.length;
  const progress = totalEpisodes > 0 ? (episode / totalEpisodes) * 100 : 0;

  return (
    <div className="glass rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      {/* Episode */}
      <div className="flex items-center gap-2 text-sm">
        <Tv className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          Episode {episode}{" "}
          <span className="text-muted-foreground">of {totalEpisodes}</span>
        </span>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-2 flex-1 min-w-[80px]" />

      {/* Merge badge */}
      <Badge variant={isPostMerge ? "default" : "secondary"} className="text-xs">
        {isPostMerge ? "🔥 Post-Merge" : "🌴 Pre-Merge"}
      </Badge>

      {/* Remaining */}
      {total > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            <span className="font-semibold text-foreground">{remaining}</span>/{total} remaining
          </span>
        </div>
      )}
    </div>
  );
}
