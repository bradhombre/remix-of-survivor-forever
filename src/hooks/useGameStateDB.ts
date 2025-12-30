import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GameState, Player, Contestant, ScoringEvent, DraftType } from "@/types/survivor";
import { toast } from "sonner";

const SESSION_ID_KEY = "survivor-session-id";
const LOCAL_MODE_KEY = "survivor-local-mode";

export const useGameStateDB = () => {
  const [state, setState] = useState<GameState>({
    mode: (localStorage.getItem(LOCAL_MODE_KEY) as GameState["mode"]) || "setup",
    season: 49,
    episode: 1,
    isPostMerge: false,
    contestants: [],
    draftOrder: ["Brad", "Coco", "Kalin", "Roy"],
    draftType: "snake",
    currentDraftIndex: 0,
    scoringEvents: [],
    cryingThisEpisode: new Set(),
    playerProfiles: {
      Brad: {},
      Coco: {},
      Kalin: {},
      Roy: {},
    },
    archivedSeasons: [],
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize or load session - ALL USERS SHARE THE SAME SESSION
  useEffect(() => {
    const initSession = async () => {
      try {
        // Always get the most recent session - NEVER create duplicates
        const { data: existingSessions, error: queryError } = await supabase
          .from("game_sessions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1);

        // CRITICAL: If query failed, don't proceed to create a new session
        if (queryError) {
          console.error("Error querying sessions:", queryError);
          toast.error("Failed to load game session. Please refresh the page.");
          setLoading(false);
          return;
        }

        if (existingSessions && existingSessions.length > 0) {
          // Always use the most recent session - data persists across republishes
          const currentSessionId = existingSessions[0].id;
          console.log("Loading existing session:", currentSessionId);
          localStorage.setItem(SESSION_ID_KEY, currentSessionId);
          setSessionId(currentSessionId);
          await loadGameState(currentSessionId);
          setLoading(false);
          return;
        }

        // DOUBLE-CHECK: Verify database is truly empty before creating
        const { count, error: countError } = await supabase
          .from("game_sessions")
          .select("*", { count: 'exact', head: true });

        if (countError) {
          console.error("Error counting sessions:", countError);
          toast.error("Failed to verify session state. Please refresh the page.");
          setLoading(false);
          return;
        }

        if (count && count > 0) {
          console.error("Race condition detected - sessions exist but weren't found in initial query");
          toast.error("Session loading issue. Please refresh the page.");
          setLoading(false);
          return;
        }

        // Only create FIRST session if database is confirmed empty
        console.log("Creating first game session (database confirmed empty)...");
        const { data: newSession, error } = await supabase
          .from("game_sessions")
          .insert({
            season: 49,
            episode: 1,
            mode: "setup",
            is_post_merge: false,
            draft_type: "snake",
            current_draft_index: 0,
          })
          .select()
          .single();

        if (error) throw error;

        const currentSessionId = newSession.id;
        localStorage.setItem(SESSION_ID_KEY, currentSessionId);
        setSessionId(currentSessionId);

        // Initialize default draft order
        const draftOrder = ["Brad", "Coco", "Kalin", "Roy"];
        await Promise.all(
          draftOrder.map((player, index) =>
            supabase.from("draft_order").insert({
              session_id: currentSessionId,
              player_name: player,
              position: index,
            })
          )
        );

        // Initialize player profiles
        await Promise.all(
          draftOrder.map((player) =>
            supabase.from("player_profiles").insert({
              session_id: currentSessionId,
              player_name: player,
            })
          )
        );

        await loadGameState(currentSessionId);
      } catch (error) {
        console.error("Error initializing session:", error);
        toast.error("Failed to initialize game session");
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  // Load game state from database
  const loadGameState = async (sid: string) => {
    try {
      const [sessionData, contestantsData, scoringData, draftData, cryingData, profilesData, archivedData] = await Promise.all([
        supabase.from("game_sessions").select("*").eq("id", sid).single(),
        supabase.from("contestants").select("*").eq("session_id", sid),
        supabase.from("scoring_events").select("*").eq("session_id", sid).order("created_at", { ascending: true }),
        supabase.from("draft_order").select("*").eq("session_id", sid).order("position", { ascending: true }),
        supabase.from("crying_contestants").select("*").eq("session_id", sid),
        supabase.from("player_profiles").select("*").eq("session_id", sid),
        supabase.from("archived_seasons").select("*").order("created_at", { ascending: false }),
      ]);

      const session = sessionData.data;
      const contestants = contestantsData.data || [];
      console.log('Loaded contestants from DB:', contestants.length, contestants.map(c => ({ name: c.name, owner: c.owner, pick: c.pick_number })));
      const scoringEvents = scoringData.data || [];
      const draftOrder = (draftData.data || []).map((d) => d.player_name);
      // Only include crying contestants for the CURRENT episode
      const currentEpisode = session?.episode || 1;
      const crying = new Set(
        (cryingData.data || [])
          .filter((c) => c.episode === currentEpisode)
          .map((c) => c.contestant_id)
      );
      const profiles = (profilesData.data || []).reduce((acc, p) => {
        acc[p.player_name] = { avatar: p.avatar };
        return acc;
      }, {} as Record<Player, { avatar?: string }>);
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
      .channel("game-state-changes")
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
    const totalPicks = 16;

    if (currentDraftIndex >= totalPicks) return;

    // Determine owner using snake draft logic
    let owner: Player;
    if (draftType === "snake") {
      const round = Math.floor(currentDraftIndex / 4);
      const posInRound = currentDraftIndex % 4;
      owner = round % 2 === 0 ? draftOrder[posInRound] : draftOrder[3 - posInRound];
      console.log(`Snake draft - Pick ${currentDraftIndex + 1}: Round ${round}, Pos ${posInRound}, Owner: ${owner}`);
    } else {
      owner = draftOrder[currentDraftIndex % 4];
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
      const leaderboard = (["Brad", "Coco", "Kalin", "Roy"] as Player[])
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