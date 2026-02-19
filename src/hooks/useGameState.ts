import { useState, useEffect } from "react";
import { GameState, Player, Contestant, ScoringEvent, DraftType } from "@/types/survivor";

const STORAGE_KEY = "survivor-fantasy-league";

const initialState: GameState = {
  mode: "setup",
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
  gameType: "full",
};

export const useGameState = () => {
  const [state, setState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          cryingThisEpisode: new Set(parsed.cryingThisEpisode || []),
          playerProfiles: parsed.playerProfiles || {
            Brad: {},
            Coco: {},
            Kalin: {},
            Roy: {},
          },
          archivedSeasons: parsed.archivedSeasons || [],
        };
      }
    } catch (error) {
      console.error("Error loading saved state:", error);
    }
    return initialState;
  });

  useEffect(() => {
    const toSave = {
      ...state,
      cryingThisEpisode: Array.from(state.cryingThisEpisode),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state]);

  const resetState = () => {
    // Archive current season before resetting
    if (state.contestants.length > 0 && state.contestants.some(c => c.owner)) {
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
            activeCount: playerContestants.filter(c => !c.isEliminated).length,
          };
        })
        .sort((a, b) => b.score - a.score);

      const archivedSeason = {
        season: state.season,
        contestants: state.contestants,
        scoringEvents: state.scoringEvents,
        finalStandings: leaderboard,
        archivedAt: Date.now(),
      };

      setState({
        ...initialState,
        season: state.season + 1,
        playerProfiles: state.playerProfiles,
        archivedSeasons: [...state.archivedSeasons, archivedSeason],
      });
    } else {
      setState({
        ...initialState,
        playerProfiles: state.playerProfiles,
        archivedSeasons: state.archivedSeasons,
      });
    }
  };

  const setMode = (mode: GameState["mode"]) => setState((prev) => ({ ...prev, mode }));

  const setSeason = (season: number) => setState((prev) => ({ ...prev, season }));

  const setEpisode = (episode: number) => {
    setState((prev) => ({
      ...prev,
      episode,
      cryingThisEpisode: new Set(),
    }));
  };

  const togglePostMerge = () => setState((prev) => ({ ...prev, isPostMerge: !prev.isPostMerge }));

  const addContestant = (name: string, tribe?: string, age?: number, location?: string) => {
    const newContestant: Contestant = {
      id: crypto.randomUUID(),
      name,
      tribe,
      age,
      location,
      isEliminated: false,
    };
    setState((prev) => ({
      ...prev,
      contestants: [...prev.contestants, newContestant],
    }));
  };

  const updateContestant = (id: string, updates: Partial<Contestant>) => {
    setState((prev) => ({
      ...prev,
      contestants: prev.contestants.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const deleteContestant = (id: string) => {
    setState((prev) => ({
      ...prev,
      contestants: prev.contestants.filter((c) => c.id !== id),
    }));
  };

  const setContestants = (contestants: Contestant[]) => {
    setState((prev) => ({ ...prev, contestants }));
  };

  const randomizeDraftOrder = () => {
    const shuffled = [...state.draftOrder].sort(() => Math.random() - 0.5);
    setState((prev) => ({ ...prev, draftOrder: shuffled }));
  };

  const setDraftOrder = (draftOrder: Player[]) => {
    setState((prev) => ({ ...prev, draftOrder }));
  };

  const setDraftType = (draftType: DraftType) => {
    setState((prev) => ({ ...prev, draftType }));
  };

  const draftContestant = (contestantId: string) => {
    const { draftOrder, currentDraftIndex, draftType, contestants } = state;
    const totalPicks = 16;

    if (currentDraftIndex >= totalPicks) return;

    const owner = draftOrder[currentDraftIndex % 4];
    const pickNumber = currentDraftIndex + 1;

    setState((prev) => {
      let nextIndex = currentDraftIndex + 1;

      if (draftType === "snake") {
        const round = Math.floor(currentDraftIndex / 4);
        const posInRound = currentDraftIndex % 4;
        
        if (round % 2 === 0) {
          nextIndex = currentDraftIndex + 1;
        } else {
          if (posInRound === 3) {
            nextIndex = (round + 1) * 4;
          } else {
            nextIndex = currentDraftIndex + 1;
          }
        }
      }

      return {
        ...prev,
        contestants: contestants.map((c) =>
          c.id === contestantId ? { ...c, owner, pickNumber } : c
        ),
        currentDraftIndex: nextIndex,
      };
    });
  };

  const addScoringEvent = (
    contestantId: string,
    contestantName: string,
    action: string,
    points: number
  ) => {
    const event: ScoringEvent = {
      id: crypto.randomUUID(),
      contestantId,
      contestantName,
      action,
      points,
      episode: state.episode,
      timestamp: Date.now(),
    };

    if (action.includes("Quit") || action.includes("Voted Out")) {
      updateContestant(contestantId, { isEliminated: true });
    }

    if (action.includes("Cry")) {
      setState((prev) => {
        const newCrying = new Set(prev.cryingThisEpisode);
        newCrying.add(contestantId);
        return {
          ...prev,
          scoringEvents: [...prev.scoringEvents, event],
          cryingThisEpisode: newCrying,
        };
      });
    } else {
      setState((prev) => ({
        ...prev,
        scoringEvents: [...prev.scoringEvents, event],
      }));
    }
  };

  const undoLastEvent = () => {
    setState((prev) => {
      if (prev.scoringEvents.length === 0) return prev;
      
      const lastEvent = prev.scoringEvents[prev.scoringEvents.length - 1];
      const newEvents = prev.scoringEvents.slice(0, -1);
      
      const newCrying = new Set(prev.cryingThisEpisode);
      if (lastEvent.action.includes("Cry")) {
        newCrying.delete(lastEvent.contestantId);
      }

      return {
        ...prev,
        scoringEvents: newEvents,
        cryingThisEpisode: newCrying,
      };
    });
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

  const importData = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      setState({
        ...parsed,
        cryingThisEpisode: new Set(parsed.cryingThisEpisode || []),
      });
    } catch (error) {
      console.error("Error importing data:", error);
      throw error;
    }
  };

  const updatePlayerAvatar = (player: Player, avatar: string) => {
    setState((prev) => ({
      ...prev,
      playerProfiles: {
        ...prev.playerProfiles,
        [player]: { ...prev.playerProfiles[player], avatar },
      },
    }));
  };

  const clearScores = () => {
    setState((prev) => ({
      ...prev,
      scoringEvents: [],
      cryingThisEpisode: new Set(),
    }));
  };

  const clearEpisodeScores = (episode: number) => {
    setState((prev) => ({
      ...prev,
      scoringEvents: prev.scoringEvents.filter(e => e.episode !== episode),
    }));
  };

  const clearHistory = () => {
    setState((prev) => ({
      ...prev,
      archivedSeasons: [],
    }));
  };

  const resetAll = () => {
    setState(initialState);
  };

  return {
    state,
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
    addScoringEvent,
    undoLastEvent,
    exportData,
    importData,
    updatePlayerAvatar,
    clearScores,
    clearEpisodeScores,
    clearHistory,
    resetAll,
  };
};
