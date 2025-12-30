import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Contestant, Player, PLAYERS } from "@/types/survivor";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Prediction {
  id: string;
  player_name: string;
  predicted_winner: string;
  is_revealed: boolean;
}

interface FinalPredictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  episode: number;
  finalists: Contestant[];
  isAdmin: boolean;
  playerName: string | null;
  onScore: (contestantId: string, contestantName: string, action: string, points: number) => void;
}

export const FinalPredictionDialog = ({
  open,
  onOpenChange,
  sessionId,
  episode,
  finalists,
  isAdmin,
  playerName,
  onScore,
}: FinalPredictionDialogProps) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | "">("");
  const [selectedWinner, setSelectedWinner] = useState("");
  const [actualVoteOut, setActualVoteOut] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadPredictions();
    }
  }, [open, sessionId, episode]);

  const loadPredictions = async () => {
    const { data, error } = await supabase
      .from("final_predictions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("episode", episode);

    if (error) {
      console.error("Error loading predictions:", error);
      return;
    }

    setPredictions(data || []);
  };

  const submitPrediction = async (playerNameOverride?: Player) => {
    const playerToSubmit = playerNameOverride || selectedPlayer;
    
    if (!playerToSubmit || !selectedWinner) {
      toast({
        title: "Missing Information",
        description: "Please select both a player and their prediction",
        variant: "destructive",
      });
      return;
    }

    // Check database for existing prediction (not local state)
    const { data: existingData, error: checkError } = await supabase
      .from("final_predictions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("episode", episode)
      .eq("player_name", playerToSubmit)
      .maybeSingle();

    if (checkError) {
      toast({
        title: "Error",
        description: "Failed to check existing predictions",
        variant: "destructive",
      });
      return;
    }
    
    if (existingData) {
      toast({
        title: "Already Submitted",
        description: `${playerToSubmit} has already submitted a prediction`,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("final_predictions").insert({
      session_id: sessionId,
      player_name: playerToSubmit,
      predicted_winner: selectedWinner,
      episode,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit prediction",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Prediction Submitted",
      description: `${playerToSubmit}'s prediction has been recorded`,
    });

    setSelectedPlayer("");
    setSelectedWinner("");
    loadPredictions();
  };

  const revealAndScore = async () => {
    if (predictions.length === 0) {
      toast({
        title: "No Predictions",
        description: "No predictions have been submitted yet",
        variant: "destructive",
      });
      return;
    }

    // Mark all predictions as revealed
    const { error: updateError } = await supabase
      .from("final_predictions")
      .update({ is_revealed: true })
      .eq("session_id", sessionId)
      .eq("episode", episode);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to reveal predictions",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Predictions Revealed",
      description: "Now select who actually got voted out to award points",
    });
    
    loadPredictions();
  };

  const confirmVoteOut = async () => {
    if (!actualVoteOut) {
      toast({
        title: "Missing Information",
        description: "Please select who actually got voted out",
        variant: "destructive",
      });
      return;
    }

    // Check if all predictions are the same
    const uniquePredictions = new Set(predictions.map(p => p.predicted_winner));
    
    if (uniquePredictions.size === 1) {
      toast({
        title: "No Points Awarded",
        description: "Everyone predicted the same person - no points awarded!",
      });
      return;
    }

    // Award 5 points to correct guessers
    const correctGuessers = predictions.filter(p => p.predicted_winner === actualVoteOut);
    
    for (const prediction of correctGuessers) {
      // Find the player's contestant to get their ID
      const playerContestant = finalists.find(c => c.owner === prediction.player_name);
      if (playerContestant) {
        onScore(playerContestant.id, playerContestant.name, "Tribal Vote Correct", 5);
      }
    }

    if (correctGuessers.length > 0) {
      toast({
        title: "Points Awarded! 🎉",
        description: `${correctGuessers.length} player(s) guessed correctly and earned 5 points`,
      });
    } else {
      toast({
        title: "No Correct Guesses",
        description: "No one predicted the vote out correctly",
      });
    }

    // Mark the voted out contestant as eliminated
    const votedOutContestant = finalists.find(c => c.name === actualVoteOut);
    if (votedOutContestant) {
      onScore(votedOutContestant.id, votedOutContestant.name, "Voted Out 💀", 0);
    }

    onOpenChange(false);
  };

  const getPlayersWhoSubmitted = () => {
    return predictions.map(p => p.player_name);
  };

  const getMissingPlayers = () => {
    const submitted = getPlayersWhoSubmitted();
    return PLAYERS.filter(p => !submitted.includes(p));
  };

  const isRevealed = predictions.length > 0 && predictions[0].is_revealed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Final Tribal Council Predictions</DialogTitle>
          <DialogDescription>
            Each player predicts who will be voted out. Correct guessers get 5 points - unless everyone picks the same person!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Submission Status */}
          <div className="space-y-2">
            <h3 className="font-semibold">Submission Status:</h3>
            <div className="grid grid-cols-2 gap-2">
              {PLAYERS.map((player) => {
                const hasSubmitted = getPlayersWhoSubmitted().includes(player);
                return (
                  <div key={player} className="flex items-center gap-2">
                    {hasSubmitted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={hasSubmitted ? "text-foreground" : "text-muted-foreground"}>
                      {player}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prediction Form */}
          {!isRevealed && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">Submit Prediction:</h3>
              <div className="grid grid-cols-2 gap-4">
                {isAdmin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Player</label>
                    <Select value={selectedPlayer} onValueChange={(value) => setSelectedPlayer(value as Player)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select player" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAYERS.map((player) => (
                          <SelectItem key={player} value={player}>
                            {player}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className={`space-y-2 ${!isAdmin ? 'col-span-2' : ''}`}>
                  <label className="text-sm font-medium">Predicted Vote Out</label>
                  <Select value={selectedWinner} onValueChange={setSelectedWinner}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contestant" />
                    </SelectTrigger>
                    <SelectContent>
                      {finalists.map((contestant) => (
                        <SelectItem key={contestant.id} value={contestant.name}>
                          {contestant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!isAdmin && playerName && !getPlayersWhoSubmitted().includes(playerName as Player) && (
                <p className="text-sm text-muted-foreground">Submitting as: {playerName}</p>
              )}
              {!isAdmin && playerName && getPlayersWhoSubmitted().includes(playerName as Player) && (
                <p className="text-sm text-green-600">✓ You've already submitted your prediction</p>
              )}
              {!isAdmin && !playerName && (
                <p className="text-sm text-destructive">Your account is not assigned to a player. Contact an admin.</p>
              )}
              <Button 
                onClick={() => {
                  if (!isAdmin && playerName) {
                    submitPrediction(playerName as Player);
                  } else {
                    submitPrediction();
                  }
                }} 
                disabled={
                  !selectedWinner || 
                  (isAdmin && !selectedPlayer) ||
                  (!isAdmin && (!playerName || getPlayersWhoSubmitted().includes(playerName as Player)))
                }
              >
                Submit Prediction
              </Button>
            </div>
          )}

          {/* Revealed Predictions */}
          {isRevealed && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Predictions:</h3>
                <div className="space-y-2">
                  {predictions.map((prediction) => (
                    <div key={prediction.id} className="flex justify-between p-2 border rounded">
                      <span className="font-medium">{prediction.player_name}</span>
                      <span className="text-muted-foreground">{prediction.predicted_winner}</span>
                    </div>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-2 p-4 border rounded-lg">
                  <h3 className="font-semibold">Who Actually Got Voted Out?</h3>
                  <Select value={actualVoteOut} onValueChange={setActualVoteOut}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contestant" />
                    </SelectTrigger>
                    <SelectContent>
                      {finalists.map((contestant) => (
                        <SelectItem key={contestant.id} value={contestant.name}>
                          {contestant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={confirmVoteOut} disabled={!actualVoteOut} className="w-full">
                    Confirm & Award Points
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Admin Controls */}
          {isAdmin && (
            <div className="flex gap-2">
              {!isRevealed && predictions.length > 0 && (
                <Button onClick={revealAndScore} variant="default">
                  Reveal & Check Predictions
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
