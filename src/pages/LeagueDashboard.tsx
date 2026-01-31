import { useEffect, useState } from "react";
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
import { LeagueInfo } from "@/components/LeagueInfo";
import { SeasonCompleteBanner } from "@/components/SeasonCompleteBanner";
import { NewsFeed } from "@/components/NewsFeed";
import { LeagueChat } from "@/components/LeagueChat";
import { Button } from "@/components/ui/button";
import { Trophy, History, Users, Shield, LogOut, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type ViewMode = "play" | "history" | "league" | "admin";

const LeagueDashboard = () => {
  const { id: leagueId } = useParams<{ id: string }>();
  const [leagueName, setLeagueName] = useState<string>("");
  const [leagueLoading, setLeagueLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("play");

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

  useEffect(() => {
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
    if (state.contestants.length >= 16 && !state.contestants.some((c) => c.owner)) {
      setMode("draft");
    }
  };

  const handleStartGame = () => {
    if (state.currentDraftIndex >= 16) {
      setMode("game");
    }
  };

  // Determine if we show Game or Draft in Play tab
  const isInDraftPhase = state.mode === "draft" || (state.mode === "setup" && state.contestants.length >= 16);
  const canShowGame = state.currentDraftIndex >= 16;

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
        </div>
      </div>

      {/* Mode Navigation - 4 tabs */}
      <div className="glass-strong border-b border-border sticky top-0 z-50 backdrop-blur-xl">
        <div className="container max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold hidden sm:block">🔥 Survivor Fantasy</h1>
              <div className="flex gap-2">
                <Button
                  onClick={() => setViewMode("play")}
                  variant={viewMode === "play" ? "accent" : "ghost"}
                  size="sm"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Play
                </Button>
                <Button
                  onClick={() => setViewMode("history")}
                  variant={viewMode === "history" ? "accent" : "ghost"}
                  size="sm"
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Button
                  onClick={() => setViewMode("league")}
                  variant={viewMode === "league" ? "accent" : "ghost"}
                  size="sm"
                >
                  <Users className="h-4 w-4 mr-2" />
                  League
                </Button>
                {isLeagueAdmin && (
                  <Button
                    onClick={() => setViewMode("admin")}
                    variant={viewMode === "admin" ? "accent" : "ghost"}
                    size="sm"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
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

      {/* Play Tab - Game or Draft */}
      {viewMode === "play" && (
        <>
        {canShowGame ? (
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
          ) : (
            <DraftMode
              leagueId={leagueId}
              contestants={state.contestants}
              draftOrder={state.draftOrder}
              draftType={state.draftType}
              currentDraftIndex={state.currentDraftIndex}
              onDraftContestant={draftContestant}
              onUndoPick={undoDraftPick}
              onStartGame={handleStartGame}
            />
          )}
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
    </div>
  );
};

export default LeagueDashboard;
