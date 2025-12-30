import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useGameStateDB } from "@/hooks/useGameStateDB";
import { useAuth } from "@/hooks/useAuth";
import { useLeagueRole } from "@/hooks/useLeagueRole";
import { supabase } from "@/integrations/supabase/client";
import { SetupMode } from "@/components/SetupMode";
import { DraftMode } from "@/components/DraftMode";
import { GameMode } from "@/components/GameMode";
import { HistoryMode } from "@/components/HistoryMode";
import { AdminPanel } from "@/components/AdminPanel";
import { LeagueSettings } from "@/components/LeagueSettings";
import { Button } from "@/components/ui/button";
import { Settings, Users, Trophy, History, Shield, LogOut, ArrowLeft, Wrench } from "lucide-react";
import { toast } from "sonner";

const LeagueDashboard = () => {
  const { id: leagueId } = useParams<{ id: string }>();
  const [leagueName, setLeagueName] = useState<string>("");
  const [leagueLoading, setLeagueLoading] = useState(true);

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
  } = useGameStateDB({ leagueId });
  
  const { user, isAdmin, playerName, loading, signOut } = useAuth();
  const { isLeagueAdmin, loading: roleLoading } = useLeagueRole(leagueId);
  const navigate = useNavigate();
  const [settingsMode, setSettingsMode] = useState(false);

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

  return (
    <div className="min-h-screen">
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

      {/* Mode Navigation */}
      <div className="glass-strong border-b border-border sticky top-0 z-50 backdrop-blur-xl">
        <div className="container max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold hidden sm:block">🔥 Survivor Fantasy</h1>
              <div className="flex gap-2">
                <Button
                  onClick={() => { setMode("game"); setSettingsMode(false); }}
                  variant={state.mode === "game" && !settingsMode ? "accent" : "ghost"}
                  size="sm"
                  disabled={state.currentDraftIndex < 16}
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Game
                </Button>
                <Button
                  onClick={() => { setMode("draft"); setSettingsMode(false); }}
                  variant={state.mode === "draft" && !settingsMode ? "accent" : "ghost"}
                  size="sm"
                  disabled={state.contestants.length < 16}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Draft
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => { setMode("setup"); setSettingsMode(false); }}
                    variant={state.mode === "setup" && !settingsMode ? "accent" : "ghost"}
                    size="sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Setup
                  </Button>
                )}
                <Button
                  onClick={() => { setMode("history"); setSettingsMode(false); }}
                  variant={state.mode === "history" && !settingsMode ? "accent" : "ghost"}
                  size="sm"
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => { setMode("admin"); setSettingsMode(false); }}
                    variant={state.mode === "admin" && !settingsMode ? "accent" : "ghost"}
                    size="sm"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                )}
                {isLeagueAdmin && (
                  <Button
                    onClick={() => setSettingsMode(true)}
                    variant={settingsMode ? "accent" : "ghost"}
                    size="sm"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Settings
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

      {settingsMode && leagueId && (
        <LeagueSettings leagueId={leagueId} />
      )}

      {!settingsMode && state.mode === "setup" && (
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

      {!settingsMode && state.mode === "history" && (
        <HistoryMode
          archivedSeasons={state.archivedSeasons}
          playerProfiles={state.playerProfiles}
        />
      )}

      {!settingsMode && state.mode === "draft" && (
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

      {!settingsMode && state.mode === "game" && (
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

      {!settingsMode && state.mode === "admin" && isAdmin && (
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

export default LeagueDashboard;
