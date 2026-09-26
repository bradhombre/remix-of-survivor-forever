import { useState, useEffect, useMemo } from "react";
import { ContestantAvatar } from "./ContestantAvatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArchivedSeason, Player } from "@/types/survivor";
import { Download, Calendar, Users, Trophy } from "lucide-react";

interface HistoryModeProps {
  leagueId?: string;
  archivedSeasons: ArchivedSeason[];
  playerProfiles: Record<Player, { avatar?: string }>;
}

export const HistoryMode = ({ archivedSeasons, playerProfiles }: HistoryModeProps) => {
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<ArchivedSeason | null>(null);

  // One entry per season, newest first (archivedSeasons is already newest-first,
  // so if a season was archived twice we keep the latest copy)
  const seasonNumbers = useMemo(
    () => Array.from(new Set(archivedSeasons.map((s) => s.season))).sort((a, b) => b - a),
    [archivedSeasons]
  );

  // Auto-select the most recent season when data is available
  useEffect(() => {
    if (selectedSeasonNumber) return;
    if (seasonNumbers.length > 0) setSelectedSeasonNumber(String(seasonNumbers[0]));
  }, [seasonNumbers, selectedSeasonNumber]);

  // When season selection changes, find the matching archived data
  useEffect(() => {
    if (selectedSeasonNumber) {
      const seasonNum = parseInt(selectedSeasonNumber);
      const archived = archivedSeasons.find((s) => s.season === seasonNum);
      setSelectedSeason(archived || null);
    }
  }, [selectedSeasonNumber, archivedSeasons]);

  const exportSeason = (season: ArchivedSeason) => {
    const dataStr = JSON.stringify(season, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `survivor-s${season.season}-archived.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 0: return "🥇";
      case 1: return "🥈";
      case 2: return "🥉";
      default: return "4️⃣";
    }
  };

  // No completed sessions or archived seasons
  if (archivedSeasons.length === 0) {
    return (
      <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="font-display text-5xl md:text-6xl leading-none">Season history</h1>
          <p className="text-muted-foreground text-lg">No archived seasons yet</p>
          <p className="text-muted-foreground">Complete a season and start a new draft to archive it here</p>
        </div>
      </div>
    );
  }

  // Show season selector and details
  if (selectedSeason) {
    return (
      <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Season Selector */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-4xl leading-none">Season history</h1>
            <Select value={selectedSeasonNumber} onValueChange={setSelectedSeasonNumber}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent>
                {seasonNumbers.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Season {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => exportSeason(selectedSeason)} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Season
          </Button>
        </div>

        {/* Final Standings */}
        <div className="space-y-4">
          <h2 className="font-display text-3xl leading-none">Final standings</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedSeason.finalStandings.map((entry, index) => (
              <Card key={entry.player} className="glass-strong p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-xl font-black tabular ${index === 0 ? "bg-warning text-warning-foreground border-2 border-plank" : "text-primary"}`}>{index + 1}</span>
                  <span className="text-sm text-muted-foreground">{entry.activeCount} still in</span>
                </div>
                
                {playerProfiles[entry.player]?.avatar && (
                  <img 
                    src={playerProfiles[entry.player].avatar} 
                    alt={entry.player}
                    className="w-16 h-16 rounded-full object-cover border-2 border-border mx-auto"
                  />
                )}
                
                <div className="text-center">
                  <h3 className="font-display text-2xl leading-none">{entry.player}</h3>
                  <p className="text-4xl font-black tracking-tight tabular">{entry.score}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Season Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="glass p-6 space-y-2">
            <Users className="h-8 w-8 text-primary" />
            <p className="text-3xl font-bold">{selectedSeason.contestants.length}</p>
            <p className="text-muted-foreground">Total Contestants</p>
          </Card>
          <Card className="glass p-6 space-y-2">
            <Trophy className="h-8 w-8 text-accent" />
            <p className="text-3xl font-bold">{selectedSeason.scoringEvents.length}</p>
            <p className="text-muted-foreground">Scoring Events</p>
          </Card>
          <Card className="glass p-6 space-y-2">
            <Calendar className="h-8 w-8 text-success" />
            <p className="text-3xl font-bold">
              {selectedSeason.scoringEvents.length > 0
                ? Math.max(...selectedSeason.scoringEvents.map((e) => e.episode))
                : 0}
            </p>
            <p className="text-muted-foreground">Episodes Tracked</p>
          </Card>
        </div>

        {/* Contestants by Team */}
        <div className="space-y-6">
          <h2 className="font-display text-3xl leading-none">Team rosters</h2>
          {selectedSeason.finalStandings.map((entry) => entry.player as Player).map((player) => {
            const playerContestants = selectedSeason.contestants.filter(c => c.owner === player);
            if (playerContestants.length === 0) return null;

            return (
              <Card key={player} className="glass-strong p-6 space-y-4">
                <h3 className="text-2xl font-bold">{player}'s Team</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {playerContestants.map((contestant) => (
                    <div
                      key={contestant.id}
                      className={`glass p-3 rounded-lg ${
                        contestant.isEliminated ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ContestantAvatar name={contestant.name} imageUrl={contestant.imageUrl} size="sm" isEliminated={contestant.isEliminated} />
                        <p className="font-bold">{contestant.name}</p>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {contestant.age && <p>Age: {contestant.age}</p>}
                        {contestant.location && <p className="truncate">{contestant.location}</p>}
                        {contestant.tribe && <p>Tribe: {contestant.tribe}</p>}
                        <p>Pick #{contestant.pickNumber}</p>
                      </div>
                      {contestant.isEliminated && <p className="mt-1 inline-block rounded-full bg-destructive px-2 py-0.5 text-[11px] font-extrabold text-destructive-foreground">Voted out</p>}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Default view: prompt to select a season
  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-4xl leading-none">Season history</h1>
        <Select value={selectedSeasonNumber} onValueChange={setSelectedSeasonNumber}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select season" />
          </SelectTrigger>
          <SelectContent>
            {seasonNumbers.map((n) => (
              <SelectItem key={n} value={String(n)}>
                Season {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Select a season above to view its history
        </p>
      </div>
    </div>
  );
};
