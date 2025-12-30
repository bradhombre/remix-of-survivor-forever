import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Player, Contestant, DraftType } from "@/types/survivor";
import { ArrowRight, Undo2 } from "lucide-react";

interface DraftModeProps {
  contestants: Contestant[];
  draftOrder: Player[];
  draftType: DraftType;
  currentDraftIndex: number;
  onDraftContestant: (contestantId: string) => void;
  onUndoPick: () => void;
  onStartGame: () => void;
}

export const DraftMode = ({
  contestants,
  draftOrder,
  draftType,
  currentDraftIndex,
  onDraftContestant,
  onUndoPick,
  onStartGame,
}: DraftModeProps) => {
  const teamCount = draftOrder.length;
  const picksPerTeam = 4;
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
          🎯 Draft in Progress
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
              key={player}
              className={`glass p-4 space-y-3 transition-all ${
                isCurrentDrafter ? "ring-4 ring-accent scale-105" : ""
              } border-l-4 ${getPlayerColor(index)}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{player}</h3>
                <span className="text-sm glass-strong px-2 py-1 rounded-full">
                  {playerTeam.length}/{picksPerTeam}
                </span>
              </div>

              <div className="space-y-2">
                {playerTeam.map((contestant) => (
                  <div
                    key={contestant.id}
                    className="glass-strong p-2 rounded-lg text-sm"
                  >
                    <p className="font-medium truncate">{contestant.name}</p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {contestant.age && <p>Age: {contestant.age}</p>}
                      {contestant.location && <p className="truncate">{contestant.location}</p>}
                      <p>Pick #{contestant.pickNumber}</p>
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableContestants.map((contestant) => (
              <Button
                key={contestant.id}
                onClick={() => onDraftContestant(contestant.id)}
                variant="glass"
                className="h-auto py-4 flex-col items-start hover:scale-105 transition-transform"
              >
                <p className="font-bold text-base truncate">{contestant.name}</p>
                <div className="text-xs text-muted-foreground text-left space-y-0.5">
                  {contestant.age && <p>Age: {contestant.age}</p>}
                  {contestant.location && <p className="truncate">{contestant.location}</p>}
                  {contestant.tribe && <p>Tribe: {contestant.tribe}</p>}
                </div>
              </Button>
            ))}
          </div>
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
