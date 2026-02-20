import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, X, PartyPopper, Users, Sliders, Play, UserPlus } from "lucide-react";

type ViewMode = "play" | "history" | "league" | "admin";

interface CommissionerChecklistProps {
  leagueId: string;
  contestantCount: number;
  filledTeamCount: number;
  mode: string;
  onNavigate: (view: ViewMode) => void;
}

const STEPS = [
  {
    id: "cast",
    label: "Add your cast",
    description: "Add the Survivor contestants for this season",
    icon: Users,
    target: "admin" as ViewMode,
  },
  {
    id: "invite",
    label: "Invite players",
    description: "Share your league invite code with friends",
    icon: UserPlus,
    target: "league" as ViewMode,
  },
  {
    id: "scoring",
    label: "Customize scoring",
    description: "Tweak point values to your liking (optional)",
    icon: Sliders,
    target: "admin" as ViewMode,
  },
  {
    id: "draft",
    label: "Start the draft",
    description: "Kick off the draft once everyone's ready",
    icon: Play,
    target: "admin" as ViewMode,
  },
];

export function CommissionerChecklist({
  leagueId,
  contestantCount,
  filledTeamCount,
  mode,
  onNavigate,
}: CommissionerChecklistProps) {
  const storageKey = `checklist-dismissed-${leagueId}`;
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(storageKey) === "true";
  });

  if (dismissed) return null;

  const completionMap: Record<string, boolean> = {
    cast: contestantCount > 0,
    invite: filledTeamCount > 1,
    scoring: false, // always shown as actionable
    draft: mode !== "setup",
  };

  const completedCount = Object.values(completionMap).filter(Boolean).length;
  const allDone = completedCount >= 3; // scoring can't auto-complete, so 3/4 is effectively "done"

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setDismissed(true);
  };

  return (
    <Card className="border-primary/30 bg-primary/5 mx-4 mt-4 max-w-7xl lg:mx-auto">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">
            {allDone ? "You're all set! 🎉" : "Get Your League Ready"}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {completedCount}/4
          </Badge>
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
        {allDone ? (
          <div className="flex items-center gap-3">
            <PartyPopper className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">
              Your league is set up and ready to play. Have fun!
            </p>
            <Button size="sm" variant="outline" onClick={handleDismiss} className="ml-auto shrink-0">
              Dismiss
            </Button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {STEPS.map((step) => {
              const done = completionMap[step.id];
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => onNavigate(step.target)}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
                >
                  {done ? (
                    <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                        {step.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
