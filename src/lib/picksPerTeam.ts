export function getPicksPerTeam(
  explicit: number | null | undefined,
  gameType: string,
  contestantCount: number,
  teamCount: number
): number {
  if (gameType === "winner_takes_all") return explicit || 1;
  if (explicit) return explicit;
  if (teamCount === 0) return 1;
  return Math.min(4, Math.max(1, Math.floor(contestantCount / teamCount)));
}
