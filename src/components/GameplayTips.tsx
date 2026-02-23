import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Vote, Merge, Flame, X, Lightbulb } from "lucide-react";

interface GameplayTipsProps {
  leagueId: string;
}

const TIPS = [
  {
    icon: Trophy,
    title: "Leaderboard",
    description:
      "Your team earns points when your contestants do things in the show — find idols, win immunity, survive rounds, and more.",
  },
  {
    icon: Vote,
    title: "Final Tribal Vote",
    description:
      "Near the end of each episode, predict who gets voted out. Correct guesses earn bonus points — unless everyone picks the same person!",
  },
  {
    icon: Merge,
    title: "Post-Merge Boost",
    description:
      "Once the merge happens, your commissioner toggles Post-Merge on, which increases survival points per round.",
  },
  {
    icon: Flame,
    title: "Scoring Events",
    description:
      'Commissioners or players tap a contestant to score actions like "Find Idol", "Win Immunity", "Cry", and more during each episode.',
  },
];

export function GameplayTips({ leagueId }: GameplayTipsProps) {
  const storageKey = `game-tips-seen-${leagueId}`;
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(storageKey) === "true";
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setDismissed(true);
  };

  return (
    <Card className="border-accent/30 bg-accent/5 mx-4 mt-4 max-w-7xl lg:mx-auto">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent" />
          <CardTitle className="text-base font-semibold">How the Game Works</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map((tip) => {
            const Icon = tip.icon;
            return (
              <div key={tip.title} className="flex items-start gap-3">
                <div className="rounded-md bg-accent/10 p-1.5 shrink-0">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={handleDismiss}>
            Got it!
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
