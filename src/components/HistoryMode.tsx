import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArchivedSeason, Player } from "@/types/survivor";
import { Download, Calendar, Users, Trophy } from "lucide-react";
import { useState } from "react";

interface HistoryModeProps {
  archivedSeasons: ArchivedSeason[];
  playerProfiles: Record<Player, { avatar?: string }>;
}

export const HistoryMode = ({ archivedSeasons, playerProfiles }: HistoryModeProps) => {
  const [selectedSeason, setSelectedSeason] = useState<ArchivedSeason | null>(null);

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

  if (archivedSeasons.length === 0) {
    return (
      <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold">📜 Season History</h1>
          <p className="text-muted-foreground text-lg">No archived seasons yet</p>
          <p className="text-muted-foreground">Complete a season and start a new draft to archive it here</p>
        </div>
      </div>
    );
  }

  if (selectedSeason) {
    return (
      <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Button onClick={() => setSelectedSeason(null)} variant="outline">
              ← Back to All Seasons
            </Button>
          </div>
          <Button onClick={() => exportSeason(selectedSeason)} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Season
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold">Season {selectedSeason.season}</h1>
          <p className="text-muted-foreground">
            Archived on {new Date(selectedSeason.archivedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Final Standings */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">🏆 Final Standings</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedSeason.finalStandings.map((entry, index) => (
              <Card key={entry.player} className="glass-strong p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{getRankEmoji(index)}</span>
                  <span className="text-sm text-muted-foreground">{entry.activeCount}/4 active</span>
                </div>
                
                {playerProfiles[entry.player]?.avatar && (
                  <img 
                    src={playerProfiles[entry.player].avatar} 
                    alt={entry.player}
                    className="w-16 h-16 rounded-full object-cover border-2 border-border mx-auto"
                  />
                )}
                
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{entry.player}</h3>
                  <p className="text-4xl font-bold text-accent">{entry.score}</p>
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
              {Math.max(...selectedSeason.scoringEvents.map(e => e.episode))}
            </p>
            <p className="text-muted-foreground">Episodes Tracked</p>
          </Card>
        </div>

        {/* Contestants by Team */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">👥 Team Rosters</h2>
          {(["Brad", "Coco", "Kalin", "Roy"] as Player[]).map((player) => {
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
                      <p className="font-bold">{contestant.name}</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {contestant.age && <p>Age: {contestant.age}</p>}
                        {contestant.location && <p className="truncate">{contestant.location}</p>}
                        {contestant.tribe && <p>Tribe: {contestant.tribe}</p>}
                        <p>Pick #{contestant.pickNumber}</p>
                      </div>
                      {contestant.isEliminated && <p className="text-sm mt-1">💀 Eliminated</p>}
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

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-5xl md:text-6xl font-bold">📜 Season History</h1>
        <p className="text-muted-foreground text-lg">{archivedSeasons.length} archived season(s)</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {archivedSeasons.sort((a, b) => b.season - a.season).map((season) => (
          <Card key={season.season} className="glass p-6 space-y-4 hover:scale-105 transition-transform cursor-pointer"
            onClick={() => setSelectedSeason(season)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-3xl font-bold">Season {season.season}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(season.archivedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  exportSeason(season);
                }}
                variant="ghost"
                size="icon"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Winner</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🥇</span>
                <div>
                  <p className="font-bold text-lg">{season.finalStandings[0].player}</p>
                  <p className="text-2xl font-bold text-accent">{season.finalStandings[0].score} pts</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Contestants</p>
                <p className="text-lg font-bold">{season.contestants.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Events</p>
                <p className="text-lg font-bold">{season.scoringEvents.length}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
