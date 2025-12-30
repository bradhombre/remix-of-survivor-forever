import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GameState, Player, Contestant, ScoringEvent, DraftType } from "@/types/survivor";
import { toast } from "sonner";

const LOCAL_MODE_KEY = "survivor-local-mode";

interface UseGameStateDBOptions {
  leagueId?: string;
}

interface LeagueTeam {
  id: string;
  name: string;
  position: number;
  user_id: string | null;
}

export const useGameStateDB = (options: UseGameStateDBOptions = {}) => {
  const { leagueId } = options;
  
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeam[]>([]);
  const [state, setState] = useState<GameState>({
    mode: (localStorage.getItem(LOCAL_MODE_KEY) as GameState["mode"]) || "setup",
    season: 49,
    episode: 1,
    isPostMerge: false,
    contestants: [],
    draftOrder: [],
    draftType: "snake",
    currentDraftIndex: 0,
    scoringEvents: [],
    cryingThisEpisode: new Set(),
    playerProfiles: {},
    archivedSeasons: [],
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoringConfig, setScoringConfig] = useState<Record<string, number> | null>(null);

  // Fetch league teams
  const fetchLeagueTeams = useCallback(async () => {
    if (!leagueId) return [];
    
    const { data, error } = await supabase
      .from('league_teams')
      .select('*')
      .eq('league_id', leagueId)
      .order('position', { ascending: true });
    
    if (error) {
      console.error('Error fetching league teams:', error);
      return [];
    }
    
    return data || [];
  }, [leagueId]);

  // Initialize or load session for the specific league
  useEffect(() => {
    if (!leagueId) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        // Get league teams first
        const teams = await fetchLeagueTeams();
        setLeagueTeams(teams);

        // Get the game session for this specific league
        const { data: leagueSession, error: queryError } = await supabase
          .from("game_sessions")
          .select("*")
          .eq("league_id", leagueId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (queryError) {
          console.error("Error querying league session:", queryError);
          toast.error("Failed to load game session. Please refresh the page.");
          setLoading(false);
          return;
        }

        if (leagueSession) {
          console.log("Loading league session:", leagueSession.id);
          setSessionId(leagueSession.id);
          await loadGameState(leagueSession.id, teams);
          
          // Fetch league's scoring config
          const { data: leagueData } = await supabase
            .from("leagues")
            .select("scoring_config")
            .eq("id", leagueId)
            .maybeSingle();
          
          if (leagueData?.scoring_config) {
            setScoringConfig(leagueData.scoring_config as Record<string, number>);
          }
          
          setLoading(false);
          return;
        }

        // No session exists for this league - this shouldn't happen since create_league creates one
        console.error("No game session found for league:", leagueId);
        toast.error("No game session found for this league.");
        setLoading(false);
      } catch (error) {
        console.error("Error initializing session:", error);
        toast.error("Failed to initialize game session");
        setLoading(false);
      }
    };

    initSession();
  }, [leagueId, fetchLeagueTeams]);

  // Load game state from database
  const loadGameState = async (sid: string, teams?: LeagueTeam[]) => {
    try {
      const teamsToUse = teams || leagueTeams;
      
      const [sessionData, contestantsData, scoringData, draftData, cryingData, profilesData, archivedData] = await Promise.all([
        supabase.from("game_sessions").select("*").eq("id", sid).single(),
        supabase.from("contestants").select("*").eq("session_id", sid),
        supabase.from("scoring_events").select("*").eq("session_id", sid).order("created_at", { ascending: true }),
        supabase.from("draft_order").select("*").eq("session_id", sid).order("position", { ascending: true }),
        supabase.from("crying_contestants").select("*").eq("session_id", sid),
        supabase.from("player_profiles").select("*").eq("session_id", sid),
        leagueId 
          ? supabase.from("archived_seasons").select("*").eq("league_id", leagueId).order("created_at", { ascending: false })
          : supabase.from("archived_seasons").select("*").order("created_at", { ascending: false }),
      ]);

      const session = sessionData.data;
      const contestants = contestantsData.data || [];
      console.log('Loaded contestants from DB:', contestants.length, contestants.map(c => ({ name: c.name, owner: c.owner, pick: c.pick_number })));
      const scoringEvents = scoringData.data || [];
      
      // Use draft_order table if populated, otherwise use league teams
      let draftOrder: string[];
      if (draftData.data && draftData.data.length > 0) {
        draftOrder = draftData.data.map((d) => d.player_name);
      } else {
        // Initialize from league teams
        draftOrder = teamsToUse.map(t => t.name);
      }
      
      // Only include crying contestants for the CURRENT episode
      const currentEpisode = session?.episode || 1;
      const crying = new Set(
        (cryingData.data || [])
          .filter((c) => c.episode === currentEpisode)
          .map((c) => c.contestant_id)
      );
      
      // Build player profiles from both DB and league teams
      const profiles = (profilesData.data || []).reduce((acc, p) => {
        acc[p.player_name] = { avatar: p.avatar };
        return acc;
      }, {} as Record<Player, { avatar?: string }>);
      
      // Ensure all teams have a profile entry
      teamsToUse.forEach(team => {
        if (!profiles[team.name]) {
          profiles[team.name] = {};
        }
      });
      
      const archived = (archivedData.data || []).map((a) => ({
        season: a.season,
        contestants: (a.contestants as any) as Contestant[],
        scoringEvents: (a.scoring_events as any) as ScoringEvent[],
        finalStandings: (a.final_standings as any) as any[],
        archivedAt: a.archived_at,
      }));

      // Use local mode for this browser, not the shared DB mode
      const localMode = (localStorage.getItem(LOCAL_MODE_KEY) as GameState["mode"]) || "game";
      console.log(`Loading game state - local mode: ${localMode}, draft index: ${session.current_draft_index}`);

      setState({
        mode: localMode,
        season: session.season,
        episode: session.episode,
        isPostMerge: session.is_post_merge,
        contestants: contestants.map((c) => ({
          id: c.id,
          name: c.name,
          tribe: c.tribe,
          age: c.age,
          location: c.location,
          owner: c.owner as Player | undefined,
          pickNumber: c.pick_number,
          isEliminated: c.is_eliminated,
        })),
        draftOrder: draftOrder as Player[],
        draftType: session.draft_type as DraftType,
        currentDraftIndex: session.current_draft_index,
        scoringEvents: scoringEvents.map((e) => ({
          id: e.id,
          contestantId: e.contestant_id,
          contestantName: e.contestant_name,
          action: e.action,
          points: e.points,
          episode: e.episode,
          timestamp: new Date(e.created_at).getTime(),
        })),
        cryingThisEpisode: crying,
        playerProfiles: profiles,
        archivedSeasons: archived,
      });
    } catch (error) {
      console.error("Error loading game state:", error);
    }
  };

  // Set up realtime subscriptions
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`game-state-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        () => loadGameState(sessionId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contestants", filter: `session_id=eq.${sessionId}` },
        () => loadGameState(sessionId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scoring_events", filter: `session_id=eq.${sessionId}` },
        () => loadGameState(sessionId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_order", filter: `session_id=eq.${sessionId}` },
        () => loadGameState(sessionId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crying_contestants", filter: `session_id=eq.${sessionId}` },
        () => loadGameState(sessionId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_profiles", filter: `session_id=eq.${sessionId}` },
        () => loadGameState(sessionId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const setMode = async (mode: GameState["mode"]) => {
    console.log(`Setting local mode to: ${mode}`);
    localStorage.setItem(LOCAL_MODE_KEY, mode);
    setState((prev) => ({ ...prev, mode }));
  };

  const setSeason = async (season: number) => {
    if (!sessionId) return;
    await supabase.from("game_sessions").update({ season }).eq("id", sessionId);
  };

  const setEpisode = async (episode: number) => {
    if (!sessionId) return;
    await supabase.from("game_sessions").update({ episode }).eq("id", sessionId);
    await supabase.from("crying_contestants").delete().eq("session_id", sessionId).eq("episode", episode);
  };

  const togglePostMerge = async () => {
    if (!sessionId) return;
    await supabase.from("game_sessions").update({ is_post_merge: !state.isPostMerge }).eq("id", sessionId);
  };

  const addContestant = async (name: string, tribe?: string, age?: number, location?: string) => {
    if (!sessionId) return;
    await supabase.from("contestants").insert({
      session_id: sessionId,
      name,
      tribe,
      age,
      location,
      is_eliminated: false,
    });
  };

  const updateContestant = async (id: string, updates: Partial<Contestant>) => {
    if (!sessionId) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.tribe !== undefined) dbUpdates.tribe = updates.tribe;
    if (updates.age !== undefined) dbUpdates.age = updates.age;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.isEliminated !== undefined) dbUpdates.is_eliminated = updates.isEliminated;
    if (updates.owner !== undefined) dbUpdates.owner = updates.owner;
    if (updates.pickNumber !== undefined) dbUpdates.pick_number = updates.pickNumber;
    
    await supabase.from("contestants").update(dbUpdates).eq("id", id);
  };

  const deleteContestant = async (id: string) => {
    if (!sessionId) return;
    await supabase.from("contestants").delete().eq("id", id);
  };

  const setContestants = async (contestants: Contestant[]) => {
    if (!sessionId) return;
    
    // Delete all existing contestants
    await supabase.from("contestants").delete().eq("session_id", sessionId);
    
    // Insert new contestants
    if (contestants.length > 0) {
      await supabase.from("contestants").insert(
        contestants.map((c) => ({
          id: c.id,
          session_id: sessionId,
          name: c.name,
          tribe: c.tribe,
          age: c.age,
          location: c.location,
          owner: c.owner,
          pick_number: c.pickNumber,
          is_eliminated: c.isEliminated,
        }))
      );
    }
  };

  const randomizeDraftOrder = async () => {
    if (!sessionId) return;
    const shuffled = [...state.draftOrder].sort(() => Math.random() - 0.5);
    await setDraftOrder(shuffled);
  };

  const setDraftOrder = async (draftOrder: Player[]) => {
    if (!sessionId) return;
    
    // Delete existing draft order
    await supabase.from("draft_order").delete().eq("session_id", sessionId);
    
    // Insert new draft order
    await Promise.all(
      draftOrder.map((player, index) =>
        supabase.from("draft_order").insert({
          session_id: sessionId,
          player_name: player,
          position: index,
        })
      )
    );
  };

  const setDraftType = async (draftType: DraftType) => {
    if (!sessionId) return;
    await supabase.from("game_sessions").update({ draft_type: draftType }).eq("id", sessionId);
  };

  const draftContestant = async (contestantId: string) => {
    if (!sessionId) return;
    
    const { draftOrder, currentDraftIndex, draftType } = state;
    const teamCount = draftOrder.length;
    const picksPerTeam = 4; // Could be made configurable
    const totalPicks = teamCount * picksPerTeam;

    if (currentDraftIndex >= totalPicks || teamCount === 0) return;

    // Determine owner using snake draft logic
    let owner: Player;
    if (draftType === "snake") {
      const round = Math.floor(currentDraftIndex / teamCount);
      const posInRound = currentDraftIndex % teamCount;
      owner = round % 2 === 0 ? draftOrder[posInRound] : draftOrder[teamCount - 1 - posInRound];
      console.log(`Snake draft - Pick ${currentDraftIndex + 1}: Round ${round}, Pos ${posInRound}, Owner: ${owner}`);
    } else {
      owner = draftOrder[currentDraftIndex % teamCount];
    }

    const pickNumber = currentDraftIndex + 1;
    const nextIndex = currentDraftIndex + 1;

    console.log(`Drafting contestant ${contestantId} to ${owner} as pick #${pickNumber}`);

    await Promise.all([
      supabase.from("contestants").update({ owner, pick_number: pickNumber }).eq("id", contestantId),
      supabase.from("game_sessions").update({ current_draft_index: nextIndex }).eq("id", sessionId),
    ]);
  };

  const undoDraftPick = async () => {
    if (!sessionId || state.currentDraftIndex === 0) return;

    // Find the most recently drafted contestant
    const lastDrafted = state.contestants
      .filter((c) => c.owner && c.pickNumber)
      .sort((a, b) => (b.pickNumber || 0) - (a.pickNumber || 0))[0];

    if (!lastDrafted) return;

    await Promise.all([
      supabase.from("contestants").update({ owner: null, pick_number: null }).eq("id", lastDrafted.id),
      supabase.from("game_sessions").update({ current_draft_index: state.currentDraftIndex - 1 }).eq("id", sessionId),
    ]);
  };

  const addScoringEvent = async (
    contestantId: string,
    contestantName: string,
    action: string,
    points: number
  ) => {
    if (!sessionId) return;

    await supabase.from("scoring_events").insert({
      session_id: sessionId,
      contestant_id: contestantId,
      contestant_name: contestantName,
      action,
      points,
      episode: state.episode,
    });

    if (action.includes("Quit") || action.includes("Voted Out")) {
      await updateContestant(contestantId, { isEliminated: true });
    }

    if (action.includes("Cry")) {
      await supabase.from("crying_contestants").insert({
        session_id: sessionId,
        contestant_id: contestantId,
        episode: state.episode,
      });
    }
  };

  const undoLastEvent = async () => {
    if (!sessionId || state.scoringEvents.length === 0) return;

    const lastEvent = state.scoringEvents[state.scoringEvents.length - 1];
    
    // Delete the scoring event
    await supabase.from("scoring_events").delete().eq("id", lastEvent.id);

    // If the event was a crying event, remove from crying contestants
    if (lastEvent.action.includes("Cry")) {
      await supabase.from("crying_contestants")
        .delete()
        .eq("contestant_id", lastEvent.contestantId)
        .eq("episode", state.episode);
    }

    // If the event was elimination, un-eliminate the contestant
    if (lastEvent.action.includes("Quit") || lastEvent.action.includes("Voted Out")) {
      await supabase.from("contestants")
        .update({ is_eliminated: false })
        .eq("id", lastEvent.contestantId);
    }
  };

  const undoEvent = async (eventId: string) => {
    if (!sessionId) return;

    const event = state.scoringEvents.find(e => e.id === eventId);
    if (!event) return;
    
    // Delete the scoring event
    await supabase.from("scoring_events").delete().eq("id", eventId);

    // If the event was a crying event, remove from crying contestants
    if (event.action.includes("Cry")) {
      await supabase.from("crying_contestants")
        .delete()
        .eq("contestant_id", event.contestantId)
        .eq("episode", event.episode);
    }

    // If the event was elimination, un-eliminate the contestant
    if (event.action.includes("Quit") || event.action.includes("Voted Out")) {
      await supabase.from("contestants")
        .update({ is_eliminated: false })
        .eq("id", event.contestantId);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(
      {
        ...state,
        cryingThisEpisode: Array.from(state.cryingThisEpisode),
      },
      null,
      2
    );
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `survivor-s${state.season}-ep${state.episode}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const importData = async (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      
      if (!sessionId) return;

      // Update session data
      await supabase.from("game_sessions").update({
        season: parsed.season,
        episode: parsed.episode,
        mode: parsed.mode,
        is_post_merge: parsed.isPostMerge,
        draft_type: parsed.draftType,
        current_draft_index: parsed.currentDraftIndex,
      }).eq("id", sessionId);

      // Update contestants
      await setContestants(parsed.contestants);

      // Update draft order
      await setDraftOrder(parsed.draftOrder);

      // Update scoring events
      await supabase.from("scoring_events").delete().eq("session_id", sessionId);
      if (parsed.scoringEvents.length > 0) {
        await supabase.from("scoring_events").insert(
          parsed.scoringEvents.map((e: ScoringEvent) => ({
            session_id: sessionId,
            contestant_id: e.contestantId,
            contestant_name: e.contestantName,
            action: e.action,
            points: e.points,
            episode: e.episode,
          }))
        );
      }

      toast.success("Data imported successfully");
    } catch (error) {
      console.error("Error importing data:", error);
      toast.error("Failed to import data");
      throw error;
    }
  };

  const updatePlayerAvatar = async (player: Player, avatar: string) => {
    if (!sessionId) return;
    
    await supabase.from("player_profiles").upsert({
      session_id: sessionId,
      player_name: player,
      avatar,
    }, {
      onConflict: "session_id,player_name",
    });
  };

  const clearScores = async () => {
    if (!sessionId) return;
    await Promise.all([
      supabase.from("scoring_events").delete().eq("session_id", sessionId),
      supabase.from("crying_contestants").delete().eq("session_id", sessionId),
    ]);
  };

  const clearEpisodeScores = async (episode: number) => {
    if (!sessionId) return;
    await supabase.from("scoring_events").delete().eq("session_id", sessionId).eq("episode", episode);
  };

  const clearHistory = async () => {
    await supabase.from("archived_seasons").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  };

  const resetAll = async () => {
    if (!sessionId) return;
    
    await Promise.all([
      supabase.from("contestants").delete().eq("session_id", sessionId),
      supabase.from("scoring_events").delete().eq("session_id", sessionId),
      supabase.from("crying_contestants").delete().eq("session_id", sessionId),
      supabase.from("game_sessions").update({
        season: 49,
        episode: 1,
        mode: "setup",
        is_post_merge: false,
        draft_type: "snake",
        current_draft_index: 0,
      }).eq("id", sessionId),
    ]);
  };

  const resetState = async () => {
    if (!sessionId) return;

    // Archive current season if there's data
    if (state.contestants.length > 0 && state.contestants.some((c) => c.owner)) {
      // Use dynamic teams from draftOrder
      const leaderboard = state.draftOrder
        .map((player) => {
          const playerContestants = state.contestants.filter((c) => c.owner === player);
          const contestantIds = playerContestants.map((c) => c.id);
          const score = state.scoringEvents
            .filter((e) => contestantIds.includes(e.contestantId))
            .reduce((sum, e) => sum + e.points, 0);
          return {
            player,
            score,
            activeCount: playerContestants.filter((c) => !c.isEliminated).length,
          };
        })
        .sort((a, b) => b.score - a.score);

      await supabase.from("archived_seasons").insert({
        season: state.season,
        contestants: state.contestants as any,
        scoring_events: state.scoringEvents as any,
        final_standings: leaderboard as any,
        archived_at: Date.now(),
        league_id: leagueId,
      });
    }

    // Clear current season data
    await Promise.all([
      supabase.from("contestants").delete().eq("session_id", sessionId),
      supabase.from("scoring_events").delete().eq("session_id", sessionId),
      supabase.from("crying_contestants").delete().eq("session_id", sessionId),
      supabase.from("game_sessions").update({
        season: state.season + 1,
        episode: 1,
        mode: "setup",
        is_post_merge: false,
        draft_type: "snake",
        current_draft_index: 0,
      }).eq("id", sessionId),
    ]);
  };

  return {
    state,
    loading,
    sessionId,
    scoringConfig,
    setState,
    resetState,
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
    updatePlayerAvatar,
    clearScores,
    clearEpisodeScores,
    clearHistory,
    resetAll,
  };
};
