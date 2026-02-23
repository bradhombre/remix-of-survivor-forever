import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useGameStateDB } from "@/hooks/useGameStateDB";
import { useAuth } from "@/hooks/useAuth";
import { useLeagueRole } from "@/hooks/useLeagueRole";
import { useLeagueTeams } from "@/hooks/useLeagueTeams";
import { supabase } from "@/integrations/supabase/client";
import { DraftMode } from "@/components/DraftMode";
import { GameMode } from "@/components/GameMode";
import { HistoryMode } from "@/components/HistoryMode";
import { AdminPanel } from "@/components/AdminPanel";
import { CommissionerChecklist } from "@/components/CommissionerChecklist";
import { OnboardingTour } from "@/components/OnboardingTour";
import { GameplayTips } from "@/components/GameplayTips";
import { getPicksPerTeam } from "@/lib/picksPerTeam";
import { LeagueInfo } from "@/components/LeagueInfo";
import { SeasonCompleteBanner } from "@/components/SeasonCompleteBanner";
import { WinnerTakesAllMode } from "@/components/WinnerTakesAllMode";
import { NewsFeed } from "@/components/NewsFeed";
import { LeagueChat } from "@/components/LeagueChat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, History, Users, Shield, LogOut, ArrowLeft, Target, ClipboardList, Info } from "lucide-react";
import { toast } from "sonner";
import { updateLastActive, trackEvent } from "@/lib/customerio";

type ViewMode = "draft" | "game" | "history" | "league" | "admin";

const LeagueDashboard = () => {
  const { id: leagueId } = useParams<{ id: string }>();
  const [leagueName, setLeagueName] = useState<string>("");
  const [leagueLoading, setLeagueLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("draft"); // will be corrected by effect

  const {
    state,
    loading: gameLoading,
    sessionId,
    sessionStatus,
    scoringConfig,
    setMode,
    setSeason,
    setEpisode,
    togglePostMerge,
    addContestant,
    updateContestant,
    deleteContestant,
    setContestants,
    randomizeDraftOrder,
    setDraftOrder,
    setDraftType,
    draftContestant,
    undoDraftPick,
    setGameType,
    setPicksPerTeam,
    addScoringEvent,
    undoLastEvent,
    undoEvent,
    exportData,
    importData,
    resetState,
    startNewSeason,
    updatePlayerAvatar,
    clearScores,
    clearEpisodeScores,
    clearHistory,
    resetAll,
  } = useGameStateDB({ leagueId });
  
  const { user, isAdmin, playerName, loading, signOut } = useAuth();
  const { isLeagueAdmin, loading: roleLoading } = useLeagueRole(leagueId);
  const { getMyTeam, teams } = useLeagueTeams({ leagueId });
  const navigate = useNavigate();
  
  // Get current user's team name for chat
  const myTeam = getMyTeam(user?.id);
  const userTeamName = myTeam?.name;

  // Track last_active_at on dashboard mount
  const hasTrackedActive = useRef(false);
  useEffect(() => {
    if (!loading && user && !hasTrackedActive.current) {
      updateLastActive(user.id);
      hasTrackedActive.current = true;
    }
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchLeague = async () => {
      if (!leagueId) return;
      
      const { data, error } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single();

      if (error) {
        toast.error('League not found');
        navigate('/leagues');
      } else {
        setLeagueName(data.name);
      }
      setLeagueLoading(false);
    };

    fetchLeague();
  }, [leagueId, navigate]);


  // Determine draft/game state (must be before early returns for hooks)
  const computedPicksPerTeam = getPicksPerTeam(state.picksPerTeam, state.gameType, state.contestants.length, state.draftOrder.length);
  const totalPicks = state.draftOrder.length * computedPicksPerTeam;
  const isInDraftPhase = state.mode === "draft" || (state.mode === "setup" && state.contestants.length >= (state.gameType === "winner_takes_all" ? 1 : computedPicksPerTeam * state.draftOrder.length));
  const canShowGame = state.currentDraftIndex >= totalPicks;

  // Set default viewMode based on game state
  useEffect(() => {
    if (canShowGame) {
      setViewMode((prev) => prev === "draft" ? "game" : prev);
    }
  }, [canShowGame]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || gameLoading || leagueLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleStartDraft = () => {
    const ppt = getPicksPerTeam(state.picksPerTeam, state.gameType, state.contestants.length, state.draftOrder.length);
    const minContestants = ppt * state.draftOrder.length;
    if (state.contestants.length >= minContestants && !state.contestants.some((c) => c.owner)) {
      setMode("draft");
      trackEvent('draft_started', {
        league_name: leagueName,
        draft_time: Math.floor(Date.now() / 1000),
      });
    }
  };

  const handleStartGame = () => {
    const ppt = getPicksPerTeam(state.picksPerTeam, state.gameType, state.contestants.length, state.draftOrder.length);
    const totalPicksCalc = state.draftOrder.length * ppt;
    if (state.currentDraftIndex >= totalPicksCalc) {
      setMode("game");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Season Complete Banner */}
      {sessionStatus === "completed" && (
        <SeasonCompleteBanner
          season={state.season}
          isLeagueAdmin={isLeagueAdmin}
          onStartNewSeason={startNewSeason}
        />
      )}

      {/* News Feed */}
      <NewsFeed />

      {/* League Header */}
      <div className="bg-muted/50 border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link 
            to="/leagues" 
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            My Leagues
          </Link>
          <span className="text-muted-foreground">/</span>
          <h2 className="font-semibold text-foreground">{leagueName}</h2>
          <Badge variant="outline" className="text-xs">
            {state.gameType === "winner_takes_all" ? (
              <><Target className="h-3 w-3 mr-1" />Winner Takes All</>
            ) : (
              <><Trophy className="h-3 w-3 mr-1" />Full Fantasy</>
            )}
          </Badge>
        </div>
      </div>

      {/* Mode Navigation - 4 tabs */}
      <div className="glass-strong border-b border-border sticky top-0 z-50 backdrop-blur-xl">
        <div className="container max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <img src="/logo.png" alt="Survivors Ready" className="h-8 w-auto hidden sm:block shrink-0" />
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto flex-nowrap">
                {!canShowGame && (
                  <Button
                    data-tour="draft"
                    onClick={() => setViewMode("draft")}
                    variant={viewMode === "draft" ? "accent" : "ghost"}
                    size="sm"
                    className="min-h-[44px] shrink-0"
                  >
                    <ClipboardList className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Draft</span>
                  </Button>
                )}
                <Button
                  data-tour="game"
                  onClick={() => setViewMode("game")}
                  variant={viewMode === "game" ? "accent" : "ghost"}
                  size="sm"
                  className="min-h-[44px] shrink-0"
                >
                  <Trophy className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Game</span>
                </Button>
                <Button
                  data-tour="history"
                  onClick={() => setViewMode("history")}
                  variant={viewMode === "history" ? "accent" : "ghost"}
                  size="sm"
                  className="min-h-[44px] shrink-0"
                >
                  <History className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">History</span>
                </Button>
                <Button
                  data-tour="league"
                  onClick={() => setViewMode("league")}
                  variant={viewMode === "league" ? "accent" : "ghost"}
                  size="sm"
                  className="min-h-[44px] shrink-0"
                >
                  <Users className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">League</span>
                </Button>
                {isLeagueAdmin && (
                  <Button
                    data-tour="admin"
                    onClick={() => setViewMode("admin")}
                    variant={viewMode === "admin" ? "accent" : "ghost"}
                    size="sm"
                    className="min-h-[44px] shrink-0"
                  >
                    <Shield className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground hidden md:block">
                Season {state.season} • Episode {state.episode}
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Commissioner Checklist - show on Draft tab during setup/draft */}
      {isLeagueAdmin && viewMode === "draft" && (state.mode === "setup" || state.mode === "draft") && (
        <CommissionerChecklist
          leagueId={leagueId!}
          contestantCount={state.contestants.length}
          filledTeamCount={teams.filter(t => t.user_id).length}
          mode={state.mode}
          onNavigate={setViewMode}
        />
      )}

      {/* Draft Tab */}
      {viewMode === "draft" && !canShowGame && (
        <DraftMode
          leagueId={leagueId}
          contestants={state.contestants}
          draftOrder={state.draftOrder}
          draftType={state.draftType}
          currentDraftIndex={state.currentDraftIndex}
          gameType={state.gameType}
          picksPerTeam={state.picksPerTeam}
          onDraftContestant={draftContestant}
          onUndoPick={undoDraftPick}
          onStartGame={handleStartGame}
        />
      )}

      {/* Game Tab */}
      {viewMode === "game" && (
        <>
          <GameplayTips leagueId={leagueId!} />
          {!canShowGame && (
            <div className="container max-w-7xl mx-auto px-4 mt-4">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" />
                <span>This page will be active once the draft is complete. Take a look around to see how scoring works!</span>
              </div>
            </div>
          )}
          <div className={!canShowGame ? "opacity-50 pointer-events-none" : ""}>
          {state.gameType === "winner_takes_all" ? (
            <WinnerTakesAllMode
              leagueId={leagueId}
              contestants={state.contestants}
              draftOrder={state.draftOrder}
              isAdmin={isLeagueAdmin}
              sessionId={sessionId || undefined}
              sessionStatus={sessionStatus}
            />
          ) : (
            <GameMode
              leagueId={leagueId}
              currentUserId={user?.id}
              season={state.season}
              episode={state.episode}
              isPostMerge={state.isPostMerge}
              contestants={state.contestants}
              scoringEvents={state.scoringEvents}
              cryingThisEpisode={state.cryingThisEpisode}
              playerProfiles={state.playerProfiles}
              scoringConfig={scoringConfig}
              draftOrder={state.draftOrder}
              isAdmin={isLeagueAdmin}
              playerName={playerName}
              sessionId={sessionId || undefined}
              onEpisodeChange={setEpisode}
              onTogglePostMerge={togglePostMerge}
              onAddScoringEvent={addScoringEvent}
              onUndo={undoLastEvent}
              onUndoEvent={undoEvent}
              onExport={exportData}
              onUpdatePlayerAvatar={updatePlayerAvatar}
            />
          )}
          </div>
        </>
      )}

      {/* History Tab */}
      {viewMode === "history" && leagueId && (
        <HistoryMode
          leagueId={leagueId}
          archivedSeasons={state.archivedSeasons}
          playerProfiles={state.playerProfiles}
        />
      )}

      {/* League Tab */}
      {viewMode === "league" && leagueId && (
        <LeagueInfo leagueId={leagueId} />
      )}

      {/* Admin Tab */}
      {viewMode === "admin" && isLeagueAdmin && leagueId && (
        <div className="container max-w-7xl mx-auto p-4">
          <AdminPanel 
            leagueId={leagueId}
            currentEpisode={state.episode}
            gameType={state.gameType}
            season={state.season}
            contestants={state.contestants}
            draftOrder={state.draftOrder}
            draftType={state.draftType}
            onSeasonChange={setSeason}
            onAddContestant={addContestant}
            onUpdateContestant={updateContestant}
            onDeleteContestant={deleteContestant}
            onRandomizeDraftOrder={randomizeDraftOrder}
            onSetDraftOrder={setDraftOrder}
            onDraftTypeChange={setDraftType}
            onStartDraft={handleStartDraft}
            onImport={importData}
            onExport={exportData}
            onSetContestants={setContestants}
            picksPerTeam={state.picksPerTeam}
            onSetPicksPerTeam={setPicksPerTeam}
            onClearScores={clearScores}
            onClearEpisodeScores={clearEpisodeScores}
            onClearHistory={clearHistory}
            onResetAll={resetAll}
            onNewSeason={() => {
              const firstConfirm = confirm(
                `⚠️ START NEW SEASON?\n\n` +
                `This will:\n` +
                `• Archive Season ${state.season}\n` +
                `• Clear all current scores\n` +
                `• Start fresh Season ${state.season + 1}\n\n` +
                `Are you sure you want to continue?`
              );
              
              if (firstConfirm) {
                const secondConfirm = confirm(
                  `🚨 FINAL CONFIRMATION 🚨\n\n` +
                  `This action CANNOT be undone!\n\n` +
                  `Click OK to archive Season ${state.season} and start Season ${state.season + 1}`
                );
                
                if (secondConfirm) {
                  resetState();
                  toast.success(`New Season Started! Season ${state.season} archived.`);
                }
              }
            }}
          />
        </div>
      )}

      {/* Floating Chat Widget */}
      <LeagueChat
        leagueId={leagueId}
        userId={user?.id}
        userEmail={user?.email}
        userTeamName={userTeamName}
        teams={teams}
      />

      {/* Onboarding Tour */}
      {leagueId && (
        <OnboardingTour leagueId={leagueId} isLeagueAdmin={isLeagueAdmin} />
      )}
    </div>
  );
};

export default LeagueDashboard;
