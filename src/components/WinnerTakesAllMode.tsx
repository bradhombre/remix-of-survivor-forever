import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Contestant, Player } from "@/types/survivor";
import { useLeagueTeams } from "@/hooks/useLeagueTeams";
import { TeamAvatar } from "./TeamAvatar";
import { ContestantAvatar } from "./ContestantAvatar";
import { Crown, Skull, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WinnerTakesAllModeProps {
  leagueId?: string;
  contestants: Contestant[];
  draftOrder: Player[];
  isAdmin: boolean;
  sessionId?: string;
  sessionStatus?: string;
}

export function WinnerTakesAllMode({
  leagueId,
  contestants,
  draftOrder,
  isAdmin,
  sessionId,
  sessionStatus,
}: WinnerTakesAllModeProps) {
  const { teams } = useLeagueTeams({ leagueId });

  const teamAvatarMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    teams.forEach((team) => {
      map[team.name] = team.avatar_url || null;
    });
    return map;
  }, [teams]);

  const draftedContestants = contestants.filter((c) => c.owner);
  const remainingContestants = draftedContestants.filter((c) => !c.isEliminated);
  const hasMultiplePicks = draftOrder.some(player => 
    draftedContestants.filter(c => c.owner === player).length > 1
  );

  // Check if there's a WIN_SURVIVOR scoring event (winner declared)
  // We detect winner by checking if a contestant's owner has the WIN_SURVIVOR event
  // For simplicity, we'll check if session is completed and only 1 remains
  const winner = sessionStatus === "completed"
    ? remainingContestants[0]
    : null;

  const handleToggleElimination = async (contestant: Contestant) => {
    if (!sessionId) return;
    await supabase
      .from("contestants")
      .update({ is_eliminated: !contestant.isEliminated })
      .eq("id", contestant.id);
  };

  const handleCrownWinner = async (contestant: Contestant) => {
    if (!sessionId) return;
    const confirmed = confirm(
      `👑 Crown ${contestant.name} as the Sole Survivor?\n\nThis will complete the season. ${contestant.owner} wins!`
    );
    if (!confirmed) return;

    // Add WIN_SURVIVOR scoring event
    await supabase.from("scoring_events").insert({
      session_id: sessionId,
      contestant_id: contestant.id,
      contestant_name: contestant.name,
      action: "Win Survivor 👑",
      points: 100,
      episode: 1,
    });

    // Mark session as completed
    await supabase
      .from("game_sessions")
      .update({ status: "completed" } as any)
      .eq("id", sessionId);

    toast.success(`🏆 ${contestant.owner} wins with ${contestant.name}!`);
  };

  // Celebration state
  if (sessionStatus === "completed" && remainingContestants.length > 0) {
    const winnerContestant = remainingContestants[0];
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
            👑 Sole Survivor
          </h1>
          <Card className="glass-strong p-8 max-w-md mx-auto space-y-4">
            <ContestantAvatar
              name={winnerContestant.name}
              imageUrl={winnerContestant.imageUrl}
              size="md"
              className="mx-auto !h-24 !w-24 !text-3xl"
            />
            <h2 className="text-3xl font-bold">{winnerContestant.name}</h2>
            <div className="flex items-center justify-center gap-2">
              <TeamAvatar
                teamName={String(winnerContestant.owner)}
                avatarUrl={teamAvatarMap[winnerContestant.owner || ""] || null}
                size="sm"
              />
              <span className="text-xl font-semibold">{winnerContestant.owner}</span>
              <Badge className="bg-accent/20 text-accent border-accent/30">
                <Trophy className="h-3 w-3 mr-1" />
                WINNER
              </Badge>
            </div>
          </Card>

          {/* Show all picks */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {draftOrder.map((player) => {
              const picks = draftedContestants.filter((c) => c.owner === player);
              if (picks.length === 0) return null;
              const hasWinner = picks.some(p => p.id === winnerContestant.id);
              return (
                <Card
                  key={player}
                  className={`glass p-4 ${hasWinner ? "ring-2 ring-accent" : "opacity-60"}`}
                >
                  <div className="flex items-center gap-3">
                    <TeamAvatar
                      teamName={String(player)}
                      avatarUrl={teamAvatarMap[player] || null}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{player}</p>
                      <div className="space-y-1">
                        {picks.map(pick => (
                          <div key={pick.id} className="flex items-center gap-2">
                            <ContestantAvatar
                              name={pick.name}
                              imageUrl={pick.imageUrl}
                              size="xs"
                              isEliminated={pick.isEliminated}
                            />
                            <span className={`text-sm ${pick.isEliminated ? "line-through text-muted-foreground" : ""}`}>
                              {pick.name}
                            </span>
                            {pick.id === winnerContestant.id && <Trophy className="h-3 w-3 text-accent" />}
                          </div>
                        ))}
                      </div>
                    </div>
                    {hasWinner && <Trophy className="h-5 w-5 text-accent" />}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
          🎯 Winner Takes All
        </h1>
        <p className="text-muted-foreground">
          {remainingContestants.length} of {draftedContestants.length} picks still alive
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {draftOrder.map((player) => {
          const picks = draftedContestants.filter((c) => c.owner === player);
          if (picks.length === 0) return null;
          const allEliminated = picks.every(p => p.isEliminated);
          const aliveCount = picks.filter(p => !p.isEliminated).length;

          return (
            <Card
              key={player}
              className={`glass p-4 transition-all ${allEliminated ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <TeamAvatar
                  teamName={String(player)}
                  avatarUrl={teamAvatarMap[player] || null}
                  size="md"
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{player}</p>
                  <div className="space-y-1 mt-1">
                    {picks.map(pick => (
                      <div key={pick.id} className="flex items-center gap-2">
                        <ContestantAvatar
                          name={pick.name}
                          imageUrl={pick.imageUrl}
                          size="sm"
                          isEliminated={pick.isEliminated}
                        />
                        <span className={`text-sm ${pick.isEliminated ? "line-through text-muted-foreground" : "font-medium"}`}>
                          {pick.name}
                        </span>
                        {pick.isEliminated ? (
                          <Skull className="h-4 w-4 text-destructive shrink-0" />
                        ) : (
                          <Badge variant="outline" className="text-success border-success/30 text-xs shrink-0">
                            Alive
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-3 space-y-2">
                  {picks.map(pick => (
                    <div key={pick.id} className="flex gap-2">
                      <span className="text-xs text-muted-foreground self-center truncate min-w-0 flex-shrink">{pick.name}</span>
                      <Button
                        size="sm"
                        variant={pick.isEliminated ? "outline" : "destructive"}
                        className="flex-1"
                        onClick={() => handleToggleElimination(pick)}
                      >
                        {pick.isEliminated ? "Undo" : "Eliminate"}
                      </Button>
                      {!pick.isEliminated && remainingContestants.length <= 2 && (
                        <Button
                          size="sm"
                          variant="accent"
                          className="gap-1"
                          onClick={() => handleCrownWinner(pick)}
                        >
                          <Crown className="h-4 w-4" />
                          Crown
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
