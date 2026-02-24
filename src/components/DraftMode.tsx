import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Player, Contestant, DraftType, GameType } from "@/types/survivor";
import { getPicksPerTeam } from "@/lib/picksPerTeam";
import { ArrowRight, Undo2 } from "lucide-react";
import { useLeagueTeams } from "@/hooks/useLeagueTeams";
import { TeamAvatar } from "./TeamAvatar";
import { ContestantAvatar } from "./ContestantAvatar";
import { updateLastActive } from "@/lib/customerio";
import { useAuth } from "@/hooks/useAuth";

interface DraftModeProps {
  leagueId?: string;
  contestants: Contestant[];
  draftOrder: Player[];
  draftType: DraftType;
  currentDraftIndex: number;
  gameType?: GameType;
  picksPerTeam?: number | null;
  onDraftContestant: (contestantId: string) => void;
  onUndoPick: () => void;
  onStartGame: () => void;
}

export const DraftMode = ({
  leagueId,
  contestants,
  draftOrder,
  draftType,
  currentDraftIndex,
  gameType = "full",
  picksPerTeam: explicitPicks,
  onDraftContestant,
  onUndoPick,
  onStartGame,
}: DraftModeProps) => {
  // Get league teams for avatars
  const { teams } = useLeagueTeams({ leagueId });
  const { user } = useAuth();

  // Map team names to their avatar URLs
  const teamAvatarMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    teams.forEach(team => {
      map[team.name] = team.avatar_url || null;
    });
    return map;
  }, [teams]);
  const teamCount = draftOrder.length;
  const picksPerTeam = getPicksPerTeam(explicitPicks, gameType, contestants.length, teamCount);
  const totalPicks = teamCount * picksPerTeam;
  const availableContestants = contestants.filter((c) => !c.owner);
  const draftedContestants = contestants.filter((c) => c.owner);

  const getCurrentDrafter = () => {
    if (currentDraftIndex >= totalPicks || teamCount === 0) return null;
    
    if (draftType === "snake") {
      const round = Math.floor(currentDraftIndex / teamCount);
      const posInRound = currentDraftIndex % teamCount;
      return round % 2 === 0 ? draftOrder[posInRound] : draftOrder[teamCount - 1 - posInRound];
    } else {
      return draftOrder[currentDraftIndex % teamCount];
    }
  };

  const currentDrafter = getCurrentDrafter();

  const handleDraftContestant = useCallback((contestantId: string) => {
    // Enforce per-team pick limit before allowing the pick
    if (currentDrafter) {
      const owned = draftedContestants.filter(c => c.owner === currentDrafter).length;
      if (owned >= picksPerTeam) {
        return; // team is full, skip
      }
    }
    if (user) updateLastActive(user.id);
    onDraftContestant(contestantId);
  }, [user, onDraftContestant, currentDrafter, draftedContestants, picksPerTeam]);
  
  const progress = totalPicks > 0 ? (currentDraftIndex / totalPicks) * 100 : 0;
  const isDraftComplete = currentDraftIndex >= totalPicks;

  const getPlayerContestants = (player: Player) => {
    return draftedContestants
      .filter((c) => c.owner === player)
      .sort((a, b) => (a.pickNumber || 0) - (b.pickNumber || 0));
  };

  // Generate colors dynamically based on position
  const teamColors = [
    "border-l-secondary",
    "border-l-primary", 
    "border-l-accent",
    "border-l-success",
    "border-l-destructive",
    "border-l-warning",
  ];
  
  const getPlayerColor = (index: number) => teamColors[index % teamColors.length];

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
          {gameType === "winner_takes_all" 
            ? (picksPerTeam > 1 ? "🎯 Pick Your Sole Survivor Predictions" : "🎯 Pick Your Sole Survivor") 
            : "🎯 Draft in Progress"}
        </h1>
        
        {!isDraftComplete && currentDrafter && (
          <div className="space-y-3">
            <div className="glass-strong p-6 rounded-2xl inline-block ring-4 ring-accent shadow-2xl">
              <p className="text-muted-foreground text-sm mb-1">Current Pick</p>
              <p className="text-4xl font-bold text-foreground">{currentDrafter}</p>
              <p className="text-accent text-lg mt-1">Pick #{currentDraftIndex + 1} of {totalPicks}</p>
            </div>
            {currentDraftIndex > 0 && (
              <Button
                onClick={onUndoPick}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Undo2 className="h-4 w-4" />
                Undo Last Pick
              </Button>
            )}
          </div>
        )}

        {isDraftComplete && (
          <div className="glass-strong p-6 rounded-2xl inline-block">
            <p className="text-3xl font-bold text-success">Draft Complete! 🎉</p>
          </div>
        )}

        <div className="max-w-md mx-auto space-y-2">
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {currentDraftIndex} / {totalPicks} picks complete
          </p>
        </div>
      </div>

      {/* Team Display */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {draftOrder.map((player, index) => {
          const playerTeam = getPlayerContestants(player);
          const isCurrentDrafter = player === currentDrafter;

          return (
            <Card
              key={`${String(player)}-${index}`}
              className={`glass p-4 space-y-3 transition-all ${
                isCurrentDrafter ? "ring-4 ring-accent scale-105" : ""
              } border-l-4 ${getPlayerColor(index)}`}
            >
              <div className="flex items-center gap-3">
                <TeamAvatar 
                  teamName={String(player)} 
                  avatarUrl={teamAvatarMap[player]} 
                  size="md"
                  className="border-2 border-border shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold truncate">{player}</h3>
                </div>
                <span className="text-sm glass-strong px-2 py-1 rounded-full shrink-0">
                  {playerTeam.length}/{picksPerTeam}
                </span>
              </div>

              <div className="space-y-2">
                {playerTeam.map((contestant) => (
                  <div
                    key={contestant.id}
                    className="glass-strong p-2 rounded-lg text-sm flex items-center gap-2"
                  >
                    <ContestantAvatar name={contestant.name} imageUrl={contestant.imageUrl} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contestant.name}</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {contestant.age && <p>Age: {contestant.age}</p>}
                        {contestant.location && <p className="truncate">{contestant.location}</p>}
                        <p>Pick #{contestant.pickNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Available Contestants */}
      {!isDraftComplete && (
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold">Available Contestants</h2>
          
          {availableContestants.length === 0 && contestants.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">No contestants have been added yet.</p>
              <p className="text-sm text-muted-foreground">Contestants need to be added in the <strong>Admin</strong> tab before drafting can begin.</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableContestants.map((contestant) => (
              <Button
                key={contestant.id}
                onClick={() => handleDraftContestant(contestant.id)}
                variant="glass"
                className="h-auto py-4 flex-col items-center hover:scale-105 transition-transform gap-2"
              >
                <ContestantAvatar name={contestant.name} imageUrl={contestant.imageUrl} size="md" />
                <p className="font-bold text-base truncate w-full text-center">{contestant.name}</p>
                <div className="text-xs text-muted-foreground text-center space-y-0.5">
                  {contestant.age && <p>Age: {contestant.age}</p>}
                  {contestant.location && <p className="truncate">{contestant.location}</p>}
                  {contestant.tribe && <p>Tribe: {contestant.tribe}</p>}
                </div>
              </Button>
            ))}
          </div>
          )}
        </Card>
      )}

      {/* Start Game Button */}
      {isDraftComplete && (
        <div className="flex justify-center">
          <Button
            onClick={onStartGame}
            size="lg"
            variant="accent"
            className="text-xl px-12 py-6"
          >
            Start Game
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
};
