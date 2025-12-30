export type Player = "Brad" | "Coco" | "Kalin" | "Roy";

export interface Contestant {
  id: string;
  name: string;
  tribe?: string;
  age?: number;
  location?: string;
  owner?: Player;
  pickNumber?: number;
  isEliminated: boolean;
}

export type DraftType = "snake" | "linear";

export interface ScoringEvent {
  id: string;
  contestantId: string;
  contestantName: string;
  action: string;
  points: number;
  episode: number;
  timestamp: number;
}

export interface ArchivedSeason {
  season: number;
  contestants: Contestant[];
  scoringEvents: ScoringEvent[];
  finalStandings: { player: Player; score: number; activeCount: number }[];
  archivedAt: number;
}

export interface GameState {
  mode: "setup" | "draft" | "game" | "history" | "admin";
  season: number;
  episode: number;
  isPostMerge: boolean;
  contestants: Contestant[];
  draftOrder: Player[];
  draftType: DraftType;
  currentDraftIndex: number;
  scoringEvents: ScoringEvent[];
  cryingThisEpisode: Set<string>;
  playerProfiles: Record<Player, { avatar?: string }>;
  archivedSeasons: ArchivedSeason[];
}

export const PLAYERS: Player[] = ["Brad", "Coco", "Kalin", "Roy"];

export const SCORING_ACTIONS = {
  FIND_IDOL: { label: "Find Idol 🗿", points: 20, emoji: "🗿" },
  ACQUIRE_IDOL: { label: "Acquire Idol (not found) 💎", points: 10, emoji: "💎" },
  FIND_ADVANTAGE: { label: "Find Advantage ⚡", points: 10, emoji: "⚡" },
  ACQUIRE_ADVANTAGE: { label: "Acquire Advantage (not found) 🎯", points: 5, emoji: "🎯" },
  VOTED_OUT_WITH_IDOL: { label: "Voted Out with Idol/Advantage 💔", points: -10, emoji: "💔" },
  WIN_IMMUNITY: { label: "Win Individual Immunity 🏆", points: 15, emoji: "🏆" },
  QUIT: { label: "Quit 🏳️", points: -50, emoji: "🏳️" },
  CATCH_TOSS: { label: "Catch Jeff Toss 🎪", points: 10, emoji: "🎪" },
  DROP_TOSS: { label: "Drop Jeff Toss 🤦", points: -10, emoji: "🤦" },
  CRY: { label: "Cry (limit 1/week) 😭", points: 5, emoji: "😭" },
  EPISODE_TITLE: { label: "Episode Title 📺", points: 5, emoji: "📺" },
  TRIBAL_VOTE_CORRECT: { label: "Tribal Vote Correct ✅", points: 5, emoji: "✅" },
  SURVIVE_PRE: { label: "Survive Round (Pre-Merge) 🌴", points: 5, emoji: "🌴" },
  SURVIVE_POST: { label: "Survive Round (Post-Merge) 🔥", points: 10, emoji: "🔥" },
  MAKE_JURY: { label: "Make Jury ⚖️", points: 50, emoji: "⚖️" },
  MAKE_FINAL: { label: "Make Final Tribal 🎭", points: 75, emoji: "🎭" },
  WIN_SURVIVOR: { label: "Win Survivor 👑", points: 100, emoji: "👑" },
  VOTED_OUT: { label: "Voted Out 💀", points: 0, emoji: "💀" },
  MISC_25: { label: "Misc +25pt Bonus ⭐", points: 25, emoji: "⭐" },
  MISC_50: { label: "Misc +50pt Bonus 🌟", points: 50, emoji: "🌟" },
  MISC_NEG_10: { label: "Misc -10pt Penalty ⚠️", points: -10, emoji: "⚠️" },
  MISC_NEG_25: { label: "Misc -25pt Penalty 🚫", points: -25, emoji: "🚫" },
};

export const SEASON_48_CONTESTANTS = [
  { name: "Stephanie Berger", tribe: "Vula" },
  { name: "Shauhin Davari", tribe: "Lagi" },
  { name: "Eva Erickson", tribe: "" },
  { name: "Kyle Fraser", tribe: "Civa" },
  { name: "Mitch Guerra", tribe: "" },
  { name: "Saiounia 'Sai' Hughley", tribe: "Vula" },
  { name: "Joe Hunter", tribe: "Lagi" },
  { name: "Kamilla Karthigesu", tribe: "Civa" },
  { name: "David Kinne", tribe: "" },
  { name: "Thomas Krottinger", tribe: "Lagi" },
  { name: "Mary Zheng", tribe: "" },
  { name: "Charity Nelms", tribe: "" },
  { name: "Chrissy Hofbeck", tribe: "" },
  { name: "Star Toomey", tribe: "" },
  { name: "Justin Klein", tribe: "" },
  { name: "Kevin Troy", tribe: "" },
  { name: "Jon Lovett", tribe: "" },
  { name: "Andy Rueda", tribe: "" },
];

export const SEASON_48_DRAFT = {
  Roy: ["David Kinne", "Stephanie Berger", "Chrissy Hofbeck", "Star Toomey"],
  Coco: ["Kyle Fraser", "Mary Zheng", "Eva Erickson", "Saiounia 'Sai' Hughley"],
  Brad: ["Shauhin Davari", "Thomas Krottinger", "Kamilla Karthigesu", "Justin Klein"],
  Kalin: ["Charity Nelms", "Mitch Guerra", "Joe Hunter", "Kevin Troy"],
};
