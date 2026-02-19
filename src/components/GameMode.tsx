import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Player, Contestant, ScoringEvent, SCORING_ACTIONS } from "@/types/survivor";
import { ChevronUp, ChevronDown, Undo, Save, Plus, Minus, Search, ChevronRight, Grid3x3, List, Upload, User, Trophy, Scale, Flame, TreePalm, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FinalPredictionDialog } from "./FinalPredictionDialog";
import { getPoints, isActionEnabled, getCustomActions, CustomScoringAction, ScoringConfig } from "@/lib/scoring";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLeagueTeams } from "@/hooks/useLeagueTeams";
import { TeamAvatar } from "./TeamAvatar";
import { TeamAvatarUpload } from "./TeamAvatarUpload";
import { ContestantAvatar } from "./ContestantAvatar";
import { SeasonProgressBar } from "./SeasonProgressBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
interface GameModeProps {
  leagueId?: string;
  currentUserId?: string;
  season: number;
  episode: number;
  isPostMerge: boolean;
  contestants: Contestant[];
  scoringEvents: ScoringEvent[];
  cryingThisEpisode: Set<string>;
  playerProfiles: Record<Player, { avatar?: string }>;
  scoringConfig?: ScoringConfig | null;
  draftOrder: Player[];
  isAdmin?: boolean;
  playerName?: string | null;
  sessionId?: string;
  onEpisodeChange: (episode: number) => void;
  onTogglePostMerge: () => void;
  onAddScoringEvent: (contestantId: string, contestantName: string, action: string, points: number) => void;
  onUndo: () => void;
  onUndoEvent?: (eventId: string) => void;
  onExport: () => void;
  onUpdatePlayerAvatar: (player: Player, avatar: string) => void;
}

export const GameMode = ({
  leagueId,
  currentUserId,
  season,
  episode,
  isPostMerge,
  contestants,
  scoringEvents,
  cryingThisEpisode,
  playerProfiles,
  scoringConfig,
  draftOrder,
  isAdmin = false,
  playerName = null,
  sessionId,
  onEpisodeChange,
  onTogglePostMerge,
  onAddScoringEvent,
  onUndo,
  onUndoEvent,
  onExport,
  onUpdatePlayerAvatar,
}: GameModeProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOwner, setFilterOwner] = useState<Player | "all">("all");
  const [showEliminated, setShowEliminated] = useState(true);
  const [expandedContestant, setExpandedContestant] = useState<string | null>(null);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<Player>>(new Set());
  const [scoringView, setScoringView] = useState<"team" | "all">("team");
  const [showPredictionDialog, setShowPredictionDialog] = useState(false);
  const [showJuryDialog, setShowJuryDialog] = useState(false);
  const [showSurvivorsDialog, setShowSurvivorsDialog] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Get league teams for avatars
  const { teams, getMyTeam, updateTeam } = useLeagueTeams({ leagueId });
  
  // Get current user's team
  const myTeam = getMyTeam(currentUserId || null);
  
  // Map team names to their team data (id + avatar_url)
  const teamDataMap = useMemo(() => {
    const map: Record<string, { id: string; avatar_url: string | null }> = {};
    teams.forEach(team => {
      map[team.name] = { id: team.id, avatar_url: team.avatar_url || null };
    });
    return map;
  }, [teams]);
  
  // Get custom actions from scoring config
  const customActions = getCustomActions(scoringConfig);

  const handleAvatarUpload = (player: Player, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdatePlayerAvatar(player, reader.result as string);
        toast({
          title: "Profile Picture Updated! 📸",
          description: `${player}'s avatar has been updated`,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePlayerExpanded = (player: Player) => {
    setExpandedPlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(player)) {
        newSet.delete(player);
      } else {
        newSet.add(player);
      }
      return newSet;
    });
  };

  const getPlayerScore = (player: Player) => {
    const playerContestants = contestants.filter((c) => c.owner === player);
    const contestantIds = playerContestants.map((c) => c.id);
    return scoringEvents
      .filter((e) => contestantIds.includes(e.contestantId))
      .reduce((sum, e) => sum + e.points, 0);
  };

  const getPlayerScoreByEpisode = (player: Player, ep: number) => {
    const playerContestants = contestants.filter((c) => c.owner === player);
    const contestantIds = playerContestants.map((c) => c.id);
    return scoringEvents
      .filter((e) => contestantIds.includes(e.contestantId) && e.episode === ep)
      .reduce((sum, e) => sum + e.points, 0);
  };

  const teamCount = draftOrder.length || 4;
  const picksPerTeam = Math.ceil(contestants.filter(c => c.owner).length / teamCount) || 4;

  const leaderboard = draftOrder
    .map((player) => ({
      player,
      score: getPlayerScore(player),
      activeCount: contestants.filter((c) => c.owner === player && !c.isEliminated).length,
    }))
    .sort((a, b) => b.score - a.score);

  // Generate dynamic colors for teams
  const getTeamColor = (index: number) => {
    const colors = [
      "border-l-blue-500",
      "border-l-rose-500", 
      "border-l-amber-500",
      "border-l-emerald-500",
      "border-l-violet-500",
      "border-l-cyan-500",
      "border-l-orange-500",
      "border-l-pink-500",
    ];
    return colors[index % colors.length];
  };

  const getTeamColorByName = (player: Player | undefined) => {
    if (!player) return "";
    const index = draftOrder.indexOf(player);
    return index >= 0 ? getTeamColor(index) : "";
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 0: return "🥇";
      case 1: return "🥈";
      case 2: return "🥉";
      default: return "4️⃣";
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 0: return "border-gold bg-gold/10";
      case 1: return "border-silver bg-silver/10";
      case 2: return "border-bronze bg-bronze/10";
      default: return "border-muted";
    }
  };

  const getPlayerContestants = (player: Player) => {
    return contestants
      .filter((c) => c.owner === player)
      .sort((a, b) => (a.pickNumber || 0) - (b.pickNumber || 0));
  };

  const getContestantScore = (contestantId: string) => {
    return scoringEvents
      .filter((e) => e.contestantId === contestantId)
      .reduce((sum, e) => sum + e.points, 0);
  };

  const filteredContestants = contestants.filter((c) => {
    if (!showEliminated && c.isEliminated) return false;
    if (filterOwner !== "all" && c.owner !== filterOwner) return false;
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const contestantsByOwner = draftOrder.map((player) => ({
    player,
    contestants: filteredContestants.filter((c) => c.owner === player),
  }));

  const episodeEvents = scoringEvents.filter((e) => e.episode === episode);

  const handleQuickScore = (contestant: Contestant, action: string, points: number) => {
    if (action.includes("Cry") && cryingThisEpisode.has(contestant.id)) {
      toast({
        title: "Already Cried This Episode 😭",
        description: `${contestant.name} already cried this episode (limit 1)`,
        variant: "destructive",
      });
      return;
    }

    onAddScoringEvent(contestant.id, contestant.name, action, points);
    toast({
      title: points > 0 ? "Points Added! ✅" : "Points Deducted! ⚠️",
      description: `${contestant.name}: ${action} (${points > 0 ? "+" : ""}${points})`,
    });
  };

  const survivePoints = isPostMerge 
    ? getPoints("SURVIVE_POST", scoringConfig) 
    : getPoints("SURVIVE_PRE", scoringConfig);
  const surviveAction = isPostMerge
    ? SCORING_ACTIONS.SURVIVE_POST
    : SCORING_ACTIONS.SURVIVE_PRE;

  // Helper: Get contestants eligible for jury points (non-eliminated, owned, no existing Make Jury event)
  const getContestantsForJuryPoints = () => {
    const alreadyAwarded = new Set(
      scoringEvents
        .filter(e => e.action === SCORING_ACTIONS.MAKE_JURY.label)
        .map(e => e.contestantId)
    );
    return contestants.filter(c => 
      !c.isEliminated && 
      c.owner && 
      !alreadyAwarded.has(c.id)
    );
  };

  // Helper: Get contestants eligible for survival points this episode
  const getContestantsForSurvivalPoints = () => {
    const surviveLabel = isPostMerge 
      ? SCORING_ACTIONS.SURVIVE_POST.label 
      : SCORING_ACTIONS.SURVIVE_PRE.label;
    
    const alreadyAwarded = new Set(
      scoringEvents
        .filter(e => e.episode === episode && e.action === surviveLabel)
        .map(e => e.contestantId)
    );
    
    return contestants.filter(c => 
      !c.isEliminated && 
      c.owner && 
      !alreadyAwarded.has(c.id)
    );
  };

  // Handler: Award jury points to all eligible contestants
  const handleAwardAllJuryPoints = () => {
    const eligible = getContestantsForJuryPoints();
    const points = getPoints("MAKE_JURY", scoringConfig);
    
    for (const contestant of eligible) {
      onAddScoringEvent(contestant.id, contestant.name, SCORING_ACTIONS.MAKE_JURY.label, points);
    }
    
    toast({
      title: "Jury Points Awarded! ⚖️",
      description: `Awarded ${points} points to ${eligible.length} contestant(s)`,
    });
    
    setShowJuryDialog(false);
  };

  // Handler: Award survival points to all eligible contestants
  const handleAwardAllSurvivalPoints = () => {
    const eligible = getContestantsForSurvivalPoints();
    const actionKey = isPostMerge ? "SURVIVE_POST" : "SURVIVE_PRE";
    const action = SCORING_ACTIONS[actionKey];
    const points = getPoints(actionKey, scoringConfig);
    
    for (const contestant of eligible) {
      onAddScoringEvent(contestant.id, contestant.name, action.label, points);
    }
    
    toast({
      title: `Survival Points Awarded! ${isPostMerge ? "🔥" : "🌴"}`,
      description: `Awarded ${points} points to ${eligible.length} contestant(s)`,
    });
    
    setShowSurvivorsDialog(false);
  };

  return (
    <TooltipProvider>
    <div className="container max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="glass-strong p-6 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              🔥 Season {season}
            </h1>
            <p className="text-muted-foreground">Episode {episode}</p>
          </div>

          {/* Mobile Layout */}
          {isMobile ? (
            <div className="flex flex-col gap-2 w-full mt-2">
              {/* Row 1: Episode controls + Pre/Post Merge */}
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center glass rounded-lg">
                  <Button
                    onClick={() => isAdmin && onEpisodeChange(Math.max(1, episode - 1))}
                    size="sm"
                    variant="ghost"
                    disabled={!isAdmin}
                    className={!isAdmin ? "cursor-not-allowed" : ""}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-2 font-bold text-sm">Ep {episode}</span>
                  <Button
                    onClick={() => isAdmin && onEpisodeChange(episode + 1)}
                    size="sm"
                    variant="ghost"
                    disabled={!isAdmin}
                    className={!isAdmin ? "cursor-not-allowed" : ""}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => isAdmin && onTogglePostMerge()}
                      variant={isPostMerge ? "accent" : "outline"}
                      size="sm"
                      disabled={!isAdmin}
                      className={!isAdmin ? "cursor-not-allowed" : ""}
                    >
                      {isPostMerge ? "🔥 Post" : "🌴 Pre"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle between pre-merge (+5) and post-merge (+10) survival points</TooltipContent>
                </Tooltip>
              </div>

              {/* Row 2: Tribal + Actions dropdown (admin) or icon buttons (non-admin) */}
              <div className="flex items-center gap-2 w-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => setShowPredictionDialog(true)}
                      className="flex-1 gap-1"
                    >
                      <Trophy className="h-4 w-4" />
                      Tribal
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Submit predictions and vote out contestants at tribal council</TooltipContent>
                </Tooltip>

                {isAdmin && (
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Admin actions menu</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
                      <DropdownMenuItem onClick={() => setShowSurvivorsDialog(true)}>
                        {isPostMerge ? "🔥" : "🌴"} Mark All Survived
                      </DropdownMenuItem>
                      {isPostMerge && isActionEnabled("MAKE_JURY", scoringConfig) && (
                        <DropdownMenuItem onClick={() => setShowJuryDialog(true)}>
                          ⚖️ Award Jury Points
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onUndo}>
                        Undo Last Action
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onExport}>
                        Export Game Data
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {!isAdmin && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={onUndo}>
                          <Undo className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Undo last scoring action</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={onExport}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Export game data</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Desktop Layout */
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center glass rounded-lg">
                <Button
                  onClick={() => isAdmin && onEpisodeChange(Math.max(1, episode - 1))}
                  size="icon"
                  variant="ghost"
                  disabled={!isAdmin}
                  className={!isAdmin ? "cursor-not-allowed" : ""}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-4 font-bold">Ep {episode}</span>
                <Button
                  onClick={() => isAdmin && onEpisodeChange(episode + 1)}
                  size="icon"
                  variant="ghost"
                  disabled={!isAdmin}
                  className={!isAdmin ? "cursor-not-allowed" : ""}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => isAdmin && onTogglePostMerge()}
                    variant={isPostMerge ? "accent" : "outline"}
                    disabled={!isAdmin}
                    className={!isAdmin ? "cursor-not-allowed" : ""}
                  >
                    {isPostMerge ? "Post-Merge 🔥" : "Pre-Merge 🌴"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle between pre-merge (+5) and post-merge (+10) survival points</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowPredictionDialog(true)}
                    variant="default"
                    className="gap-2"
                  >
                    <Trophy className="h-4 w-4" />
                    Tribal Prediction
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Submit predictions and vote out contestants at tribal council</TooltipContent>
              </Tooltip>

              {/* Bulk Survival Points Button - Admin only */}
              {isAdmin && (
                <AlertDialog open={showSurvivorsDialog} onOpenChange={setShowSurvivorsDialog}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          {isPostMerge ? <Flame className="h-4 w-4" /> : <TreePalm className="h-4 w-4" />}
                          {isPostMerge ? "🔥" : "🌴"} Mark Survivors
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Award survival points to all remaining contestants this episode</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Award Survival Points</AlertDialogTitle>
                      <AlertDialogDescription>
                        Award {survivePoints} points ({isPostMerge ? "Post-Merge" : "Pre-Merge"}) to all surviving, owned contestants for Episode {episode}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="max-h-48 overflow-y-auto space-y-1 my-4">
                      {getContestantsForSurvivalPoints().map(c => (
                        <div key={c.id} className="text-sm flex justify-between p-2 glass rounded">
                          <span>{c.name}</span>
                          <span className="text-muted-foreground">{c.owner}</span>
                        </div>
                      ))}
                      {getContestantsForSurvivalPoints().length === 0 && (
                        <p className="text-muted-foreground text-center py-4">All contestants already awarded this episode</p>
                      )}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleAwardAllSurvivalPoints}
                        disabled={getContestantsForSurvivalPoints().length === 0}
                      >
                        Award {getContestantsForSurvivalPoints().length} Contestant(s)
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Bulk Jury Points Button - Admin only, post-merge only */}
              {isAdmin && isPostMerge && isActionEnabled("MAKE_JURY", scoringConfig) && (
                <AlertDialog open={showJuryDialog} onOpenChange={setShowJuryDialog}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Scale className="h-4 w-4" />
                          ⚖️ Award Jury
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Award +50 jury points to all surviving contestants</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Award Jury Points</AlertDialogTitle>
                      <AlertDialogDescription>
                        Award {getPoints("MAKE_JURY", scoringConfig)} points to all surviving, owned contestants who haven't already received jury points.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="max-h-48 overflow-y-auto space-y-1 my-4">
                      {getContestantsForJuryPoints().map(c => (
                        <div key={c.id} className="text-sm flex justify-between p-2 glass rounded">
                          <span>{c.name}</span>
                          <span className="text-muted-foreground">{c.owner}</span>
                        </div>
                      ))}
                      {getContestantsForJuryPoints().length === 0 && (
                        <p className="text-muted-foreground text-center py-4">No eligible contestants</p>
                      )}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleAwardAllJuryPoints}
                        disabled={getContestantsForJuryPoints().length === 0}
                      >
                        Award {getContestantsForJuryPoints().length} Contestant(s)
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onUndo} variant="outline" size="icon">
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo last scoring action</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onExport} variant="outline" size="icon">
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export game data</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Season Progress */}
        <SeasonProgressBar
          episode={episode}
          isPostMerge={isPostMerge}
          contestants={contestants}
        />
      </div>

      {/* AlertDialogs for Mobile - need to be outside dropdown */}
      <AlertDialog open={showSurvivorsDialog} onOpenChange={setShowSurvivorsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Award Survival Points</AlertDialogTitle>
            <AlertDialogDescription>
              Award {survivePoints} points ({isPostMerge ? "Post-Merge" : "Pre-Merge"}) to all surviving, owned contestants for Episode {episode}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-48 overflow-y-auto space-y-1 my-4">
            {getContestantsForSurvivalPoints().map(c => (
              <div key={c.id} className="text-sm flex justify-between p-2 glass rounded">
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.owner}</span>
              </div>
            ))}
            {getContestantsForSurvivalPoints().length === 0 && (
              <p className="text-muted-foreground text-center py-4">All contestants already awarded this episode</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAwardAllSurvivalPoints}
              disabled={getContestantsForSurvivalPoints().length === 0}
            >
              Award {getContestantsForSurvivalPoints().length} Contestant(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showJuryDialog} onOpenChange={setShowJuryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Award Jury Points</AlertDialogTitle>
            <AlertDialogDescription>
              Award {getPoints("MAKE_JURY", scoringConfig)} points to all surviving, owned contestants who haven't already received jury points.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-48 overflow-y-auto space-y-1 my-4">
            {getContestantsForJuryPoints().map(c => (
              <div key={c.id} className="text-sm flex justify-between p-2 glass rounded">
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.owner}</span>
              </div>
            ))}
            {getContestantsForJuryPoints().length === 0 && (
              <p className="text-muted-foreground text-center py-4">No eligible contestants</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAwardAllJuryPoints}
              disabled={getContestantsForJuryPoints().length === 0}
            >
              Award {getContestantsForJuryPoints().length} Contestant(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Prediction Dialog */}
      {sessionId && (
        <FinalPredictionDialog
          open={showPredictionDialog}
          onOpenChange={setShowPredictionDialog}
          sessionId={sessionId}
          episode={episode}
          finalists={contestants.filter(c => !c.isEliminated)}
          isAdmin={isAdmin}
          playerName={playerName}
          onScore={onAddScoringEvent}
        />
      )}

      {/* Leaderboard */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {leaderboard.map((entry, index) => {
          const playerContestants = getPlayerContestants(entry.player);
          const isExpanded = expandedPlayers.has(entry.player);

          return (
            <Card
              key={entry.player}
              className={`glass border-l-4 ${getRankColor(index)} overflow-hidden`}
            >
              <Collapsible open={isExpanded} onOpenChange={() => togglePlayerExpanded(entry.player)}>
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{getRankEmoji(index)}</span>
                    <span className="text-sm text-muted-foreground">{entry.activeCount}/{picksPerTeam} active</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      {/* Show upload component for user's own team, static avatar for others */}
                      {myTeam?.name === entry.player && teamDataMap[entry.player] ? (
                        <TeamAvatarUpload
                          teamId={teamDataMap[entry.player].id}
                          leagueId={leagueId || ''}
                          currentAvatarUrl={teamDataMap[entry.player].avatar_url}
                          teamName={String(entry.player)}
                          onUploadComplete={(url) => updateTeam(teamDataMap[entry.player].id, { avatar_url: url })}
                          size="md"
                        />
                      ) : (
                        <>
                          {/* Priority: team avatar from league_teams, then playerProfiles, then themed fallback */}
                          {teamDataMap[entry.player]?.avatar_url || !playerProfiles?.[entry.player]?.avatar ? (
                            <TeamAvatar 
                              teamName={String(entry.player)} 
                              avatarUrl={teamDataMap[entry.player]?.avatar_url} 
                              size="lg"
                              className="border-2 border-border"
                            />
                          ) : (
                            <img 
                              src={playerProfiles[entry.player].avatar} 
                              alt={entry.player}
                              className="w-16 h-16 rounded-full object-cover border-2 border-border"
                            />
                          )}
                        </>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold">{entry.player}</h3>
                      <p className="text-4xl font-bold text-accent">{entry.score}</p>
                    </div>
                  </div>
                  
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full mt-2">
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Hide Team
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-4 w-4 mr-2" />
                          Show Team
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent>
                  <div className="px-6 pb-6 space-y-4">
                    {/* Episode Breakdown */}
                    <div className="glass-strong p-3 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">Episode Scores</h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {Array.from({ length: episode }, (_, i) => i + 1).map((ep) => {
                          const epScore = getPlayerScoreByEpisode(entry.player, ep);
                          return (
                            <div
                              key={ep}
                              className={`p-2 rounded ${
                                ep === episode ? 'bg-accent/20 border border-accent' : 'bg-background/50'
                              }`}
                            >
                              <div className="font-medium">Ep {ep}</div>
                              <div className="text-accent font-bold">
                                {epScore > 0 && '+'}
                                {epScore}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Team Roster */}
                    <div className="space-y-2">
                      {playerContestants.map((contestant) => {
                        const contestantScore = getContestantScore(contestant.id);
                        return (
                          <div
                            key={contestant.id}
                            className={`glass-strong p-3 rounded-lg transition-opacity ${
                              contestant.isEliminated ? "opacity-50" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <ContestantAvatar name={contestant.name} imageUrl={contestant.imageUrl} size="xs" isEliminated={contestant.isEliminated} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{contestant.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Pick #{contestant.pickNumber}
                                    {contestant.tribe && ` • ${contestant.tribe}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-accent">{contestantScore} pts</span>
                                {contestant.isEliminated && <span className="text-lg">💀</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="glass p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contestants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass"
              />
            </div>
          </div>

          <select
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value as Player | "all")}
            className="glass px-4 py-2 rounded-lg border-border"
          >
            <option value="all">All Teams</option>
            {draftOrder.map((player) => (
              <option key={player} value={player}>{player}</option>
            ))}
          </select>

          <Button
            onClick={() => setShowEliminated(!showEliminated)}
            variant={showEliminated ? "default" : "outline"}
          >
            {showEliminated ? "Hide" : "Show"} Eliminated
          </Button>
        </div>
      </Card>

      {/* Scoring Section - Grouped by Player */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">⚡ Score This Episode</h2>
          
          <div className="flex items-center gap-2 glass p-1 rounded-xl">
            <Button
              onClick={() => setScoringView("team")}
              variant={scoringView === "team" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <Grid3x3 className="h-4 w-4" />
              Team View
            </Button>
            <Button
              onClick={() => setScoringView("all")}
              variant={scoringView === "all" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <List className="h-4 w-4" />
              All Players
            </Button>
          </div>
        </div>
        
        {scoringView === "team" ? (
          contestantsByOwner.map(({ player, contestants: playerContestants }) => (
            playerContestants.length > 0 && (
            <Card key={player} className={`glass-strong border-l-4 ${getTeamColorByName(player)} overflow-hidden`}>
              <div className="p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{player}'s Team</h3>
                  <span className="text-sm text-muted-foreground px-3 py-1 glass rounded-full">
                    {playerContestants.filter(c => !c.isEliminated).length} active
                  </span>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playerContestants.map((contestant) => {
                    const isExpanded = expandedContestant === contestant.id;
                    const canCry = !cryingThisEpisode.has(contestant.id);

                    return (
                      <Card
                        key={contestant.id}
                        className={`glass p-4 space-y-3 transition-all border ${
                          contestant.isEliminated ? "opacity-50" : ""
                        }`}
                      >
                        {/* Header with Info and Top-Right Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <ContestantAvatar name={contestant.name} imageUrl={contestant.imageUrl} size="sm" isEliminated={contestant.isEliminated} className="mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-base truncate">{contestant.name}</h4>
                            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                              {contestant.age && <p>Age: {contestant.age}</p>}
                              {contestant.location && <p className="truncate">{contestant.location}</p>}
                              {contestant.tribe && <p>Tribe: {contestant.tribe}</p>}
                              <p>Pick #{contestant.pickNumber}</p>
                            </div>
                            </div>
                          </div>
                          
                          {/* Top-Right Action Buttons */}
                          <div className="flex flex-col gap-1 shrink-0">
                            {!contestant.isEliminated && (
                              <Button
                                onClick={() => handleQuickScore(contestant, surviveAction.label, survivePoints)}
                                variant="success"
                                size="sm"
                                className="text-xs h-8 px-2"
                              >
                                Survive +{survivePoints}
                              </Button>
                            )}
                            {isAdmin && !contestant.isEliminated && (
                              <Button
                                onClick={() => {
                                  handleQuickScore(contestant, SCORING_ACTIONS.VOTED_OUT.label, getPoints("VOTED_OUT", scoringConfig));
                                }}
                                variant="destructive"
                                size="sm"
                                className="text-xs h-8 px-2"
                              >
                                Voted Out
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Bottom Quick Actions */}
                        <div className="grid grid-cols-3 gap-2">
                          {isActionEnabled("WIN_IMMUNITY", scoringConfig) && (
                            <Button
                              onClick={() =>
                                handleQuickScore(
                                  contestant,
                                  SCORING_ACTIONS.WIN_IMMUNITY.label,
                                  getPoints("WIN_IMMUNITY", scoringConfig)
                                )
                              }
                              variant="accent"
                              size="sm"
                              className="text-xs"
                            >
                              🏆 Immunity
                              <br />+{getPoints("WIN_IMMUNITY", scoringConfig)}
                            </Button>
                          )}
                          {canCry && isActionEnabled("CRY", scoringConfig) && (
                            <Button
                              onClick={() => handleQuickScore(contestant, SCORING_ACTIONS.CRY.label, getPoints("CRY", scoringConfig))}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              😭 Cry
                              <br />+{getPoints("CRY", scoringConfig)}
                            </Button>
                          )}
                          <Button
                            onClick={() => setExpandedContestant(isExpanded ? null : contestant.id)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            More
                            <br />
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </div>

                        {/* Expanded Menu */}
                        {isExpanded && (
                          <div className="glass-strong p-3 rounded-lg space-y-2 animate-in slide-in-from-top">
                            {Object.entries(SCORING_ACTIONS).map(([key, action]) => {
                              if (key === "SURVIVE_PRE" || key === "SURVIVE_POST" || key === "VOTED_OUT" || key === "CRY") return null;
                              if (!isActionEnabled(key, scoringConfig)) return null;
                              const points = getPoints(key, scoringConfig);
                              return (
                                <Button
                                  key={key}
                                  onClick={() =>
                                    handleQuickScore(contestant, action.label, points)
                                  }
                                  variant={points > 0 ? "success" : "destructive"}
                                  size="sm"
                                  className="w-full justify-between text-xs"
                                >
                                  <span>{action.label}</span>
                                  <span className="font-bold">
                                    {points > 0 ? "+" : ""}
                                    {points}
                                  </span>
                                </Button>
                              );
                            })}
                            {/* Custom Actions */}
                            {customActions.length > 0 && (
                              <>
                                <div className="border-t border-border pt-2 mt-2">
                                  <span className="text-xs text-muted-foreground">✨ Custom</span>
                                </div>
                                {customActions.map((action) => (
                                  <Button
                                    key={action.id}
                                    onClick={() =>
                                      handleQuickScore(contestant, `${action.label} ${action.emoji}`, action.points)
                                    }
                                    variant={action.points > 0 ? "success" : "destructive"}
                                    size="sm"
                                    className="w-full justify-between text-xs"
                                  >
                                    <span>{action.emoji} {action.label}</span>
                                    <span className="font-bold">
                                      {action.points > 0 ? "+" : ""}
                                      {action.points}
                                    </span>
                                  </Button>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            </Card>
            )
          ))
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContestants.filter(c => c.owner).map((contestant) => {
              const isExpanded = expandedContestant === contestant.id;
              const canCry = !cryingThisEpisode.has(contestant.id);

              return (
                <Card
                  key={contestant.id}
                  className={`glass p-4 space-y-3 border-l-4 ${getTeamColorByName(contestant.owner)} transition-all ${
                    contestant.isEliminated ? "opacity-50" : ""
                  }`}
                >
                  {/* Header with Info and Top-Right Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <ContestantAvatar name={contestant.name} imageUrl={contestant.imageUrl} size="sm" isEliminated={contestant.isEliminated} className="mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base truncate">{contestant.name}</h4>
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        {contestant.age && <p>Age: {contestant.age}</p>}
                        {contestant.location && <p className="truncate">{contestant.location}</p>}
                        {contestant.tribe && <p>Tribe: {contestant.tribe}</p>}
                        <p>{contestant.owner} • Pick #{contestant.pickNumber}</p>
                      </div>
                      </div>
                    </div>
                    
                    {/* Top-Right Action Buttons */}
                    <div className="flex flex-col gap-1 shrink-0">
                      {!contestant.isEliminated && (
                        <Button
                          onClick={() => handleQuickScore(contestant, surviveAction.label, survivePoints)}
                          variant="success"
                          size="sm"
                          className="text-xs h-8 px-2"
                        >
                          Survive +{survivePoints}
                        </Button>
                      )}
                      {isAdmin && !contestant.isEliminated && (
                        <Button
                          onClick={() => {
                            handleQuickScore(contestant, SCORING_ACTIONS.VOTED_OUT.label, getPoints("VOTED_OUT", scoringConfig));
                          }}
                          variant="destructive"
                          size="sm"
                          className="text-xs h-8 px-2"
                        >
                          Voted Out
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Quick Actions */}
                  <div className="grid grid-cols-3 gap-2">
                    {isActionEnabled("WIN_IMMUNITY", scoringConfig) && (
                      <Button
                        onClick={() =>
                          handleQuickScore(
                            contestant,
                            SCORING_ACTIONS.WIN_IMMUNITY.label,
                            getPoints("WIN_IMMUNITY", scoringConfig)
                          )
                        }
                        variant="accent"
                        size="sm"
                        className="text-xs"
                      >
                        🏆 Immunity
                        <br />+{getPoints("WIN_IMMUNITY", scoringConfig)}
                      </Button>
                    )}
                    {canCry && isActionEnabled("CRY", scoringConfig) && (
                      <Button
                        onClick={() => handleQuickScore(contestant, SCORING_ACTIONS.CRY.label, getPoints("CRY", scoringConfig))}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        😭 Cry
                        <br />+{getPoints("CRY", scoringConfig)}
                      </Button>
                    )}
                    <Button
                      onClick={() => setExpandedContestant(isExpanded ? null : contestant.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      More
                      <br />
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>

                  {/* Expanded Menu */}
                  {isExpanded && (
                    <div className="glass-strong p-3 rounded-lg space-y-2 animate-in slide-in-from-top">
                      {Object.entries(SCORING_ACTIONS).map(([key, action]) => {
                        if (key === "SURVIVE_PRE" || key === "SURVIVE_POST" || key === "VOTED_OUT" || key === "CRY") return null;
                        if (!isActionEnabled(key, scoringConfig)) return null;
                        const points = getPoints(key, scoringConfig);
                        return (
                          <Button
                            key={key}
                            onClick={() =>
                              handleQuickScore(contestant, action.label, points)
                            }
                            variant={points > 0 ? "success" : "destructive"}
                            size="sm"
                            className="w-full justify-between text-xs"
                          >
                            <span>{action.label}</span>
                            <span className="font-bold">
                              {points > 0 ? "+" : ""}
                              {points}
                            </span>
                          </Button>
                        );
                      })}
                      {/* Custom Actions */}
                      {customActions.length > 0 && (
                        <>
                          <div className="border-t border-border pt-2 mt-2">
                            <span className="text-xs text-muted-foreground">✨ Custom</span>
                          </div>
                          {customActions.map((action) => (
                            <Button
                              key={action.id}
                              onClick={() =>
                                handleQuickScore(contestant, `${action.label} ${action.emoji}`, action.points)
                              }
                              variant={action.points > 0 ? "success" : "destructive"}
                              size="sm"
                              className="w-full justify-between text-xs"
                            >
                              <span>{action.emoji} {action.label}</span>
                              <span className="font-bold">
                                {action.points > 0 ? "+" : ""}
                                {action.points}
                              </span>
                            </Button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Episode Log */}
      <Card className="glass p-6 space-y-4">
        <h2 className="text-2xl font-bold">📜 Episode {episode} Events</h2>
        
        {episodeEvents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No points scored yet this episode. Use the buttons above to score actions.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[...episodeEvents].reverse().map((event) => (
              <div
                key={event.id}
                className={`glass-strong p-3 rounded-lg flex items-center justify-between gap-4 ${
                  event.points > 0 ? "border-l-4 border-l-success" : "border-l-4 border-l-destructive"
                }`}
              >
                <div className="flex-1">
                  <span className="font-bold">{event.contestantName}</span>
                  <span className="text-muted-foreground mx-2">•</span>
                  <span>{event.action}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-bold text-lg ${
                      event.points > 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {event.points > 0 ? "+" : ""}
                    {event.points}
                  </span>
                  {onUndoEvent && (
                    <Button
                      onClick={() => {
                        onUndoEvent(event.id);
                        toast({
                          title: "Event Removed",
                          description: `Removed: ${event.contestantName} - ${event.action}`,
                        });
                      }}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Undo className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
    </TooltipProvider>
  );
};
