import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStateDB } from "@/hooks/useGameStateDB";
import { useAuth } from "@/hooks/useAuth";
import { SetupMode } from "@/components/SetupMode";
import { DraftMode } from "@/components/DraftMode";
import { GameMode } from "@/components/GameMode";
import { HistoryMode } from "@/components/HistoryMode";
import { AdminPanel } from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { Settings, Users, Trophy, History, Shield, LogOut } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const {
    state,
    loading: gameLoading,
    sessionId,
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
    updatePlayerAvatar,
    clearScores,
    clearEpisodeScores,
    clearHistory,
    resetAll,
  } = useGameStateDB();
  
  const { user, isAdmin, playerName, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || gameLoading) {
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

  return (
    <div className="min-h-screen">
      {/* Mode Navigation */}
      <div className="glass-strong border-b border-border sticky top-0 z-50 backdrop-blur-xl">
        <div className="container max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold hidden sm:block">🔥 Survivor Fantasy</h1>
              <div className="flex gap-2">
                <Button
                  onClick={() => setMode("game")}
                  variant={state.mode === "game" ? "accent" : "ghost"}
                  size="sm"
                  disabled={state.currentDraftIndex < 16}
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Game
                </Button>
                <Button
                  onClick={() => setMode("draft")}
                  variant={state.mode === "draft" ? "accent" : "ghost"}
                  size="sm"
                  disabled={state.contestants.length < 16}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Draft
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => setMode("setup")}
                    variant={state.mode === "setup" ? "accent" : "ghost"}
                    size="sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Setup
                  </Button>
                )}
                <Button
                  onClick={() => setMode("history")}
                  variant={state.mode === "history" ? "accent" : "ghost"}
                  size="sm"
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => setMode("admin")}
                    variant={state.mode === "admin" ? "accent" : "ghost"}
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

      {state.mode === "setup" && (
        <SetupMode
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
        />
      )}

      {state.mode === "history" && (
        <HistoryMode
          archivedSeasons={state.archivedSeasons}
          playerProfiles={state.playerProfiles}
        />
      )}

      {state.mode === "draft" && (
        <DraftMode
          contestants={state.contestants}
          draftOrder={state.draftOrder}
          draftType={state.draftType}
          currentDraftIndex={state.currentDraftIndex}
          onDraftContestant={draftContestant}
          onUndoPick={undoDraftPick}
          onStartGame={handleStartGame}
        />
      )}

      {state.mode === "game" && (
        <GameMode
          season={state.season}
          episode={state.episode}
          isPostMerge={state.isPostMerge}
          contestants={state.contestants}
          scoringEvents={state.scoringEvents}
          cryingThisEpisode={state.cryingThisEpisode}
          playerProfiles={state.playerProfiles}
          isAdmin={isAdmin}
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

      {state.mode === "admin" && isAdmin && (
        <div className="container max-w-7xl mx-auto p-4">
          <AdminPanel 
            currentEpisode={state.episode}
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
    </div>
  );
};

export default Index;
