import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface CompletedSession {
  id: string;
  season: number;
  updated_at: string;
}

interface HistoryModeProps {
  leagueId: string;
  archivedSeasons: ArchivedSeason[];
  playerProfiles: Record<Player, { avatar?: string }>;
}

export const HistoryMode = ({ leagueId, archivedSeasons, playerProfiles }: HistoryModeProps) => {
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([]);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<ArchivedSeason | null>(null);

  // Fetch completed sessions for this league
  useEffect(() => {
    const fetchCompletedSessions = async () => {
      const { data } = await supabase
        .from("game_sessions")
        .select("id, season, updated_at")
        .eq("league_id", leagueId)
        .eq("status", "completed")
        .order("season", { ascending: false });

      if (data && data.length > 0) {
        setCompletedSessions(data);
      }
    };

    fetchCompletedSessions();
  }, [leagueId]);

  // Auto-select the most recent season when data is available
  useEffect(() => {
    if (selectedSeasonNumber) return; // already selected

    // Gather all available season numbers from both sources
    const allSeasons = new Set<number>();
    completedSessions.forEach((s) => allSeasons.add(s.season));
    archivedSeasons.forEach((s) => allSeasons.add(s.season));

    if (allSeasons.size > 0) {
      const mostRecent = Math.max(...allSeasons);
      setSelectedSeasonNumber(String(mostRecent));
    }
  }, [completedSessions, archivedSeasons, selectedSeasonNumber]);

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
  if (completedSessions.length === 0 && archivedSeasons.length === 0) {
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

  // Show season selector and details
  if (selectedSeason) {
    return (
      <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Season Selector */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">📜 Season History</h1>
            <Select value={selectedSeasonNumber} onValueChange={setSelectedSeasonNumber}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent>
                {completedSessions.map((session) => (
                  <SelectItem key={session.id} value={String(session.season)}>
                    Season {session.season}
                  </SelectItem>
                ))}
                {/* Also include archived seasons not in completed sessions */}
                {archivedSeasons
                  .filter((as) => !completedSessions.some((cs) => cs.season === as.season))
                  .map((as) => (
                    <SelectItem key={as.season} value={String(as.season)}>
                      Season {as.season}
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

  // Default view: prompt to select a season
  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">📜 Season History</h1>
        <Select value={selectedSeasonNumber} onValueChange={setSelectedSeasonNumber}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select season" />
          </SelectTrigger>
          <SelectContent>
            {completedSessions.map((session) => (
              <SelectItem key={session.id} value={String(session.season)}>
                Season {session.season}
              </SelectItem>
            ))}
            {archivedSeasons
              .filter((as) => !completedSessions.some((cs) => cs.season === as.season))
              .map((as) => (
                <SelectItem key={as.season} value={String(as.season)}>
                  Season {as.season}
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
