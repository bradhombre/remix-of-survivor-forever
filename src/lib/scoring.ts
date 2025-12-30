import { SCORING_ACTIONS } from "@/types/survivor";

export type ScoringConfig = Record<string, number>;

export const getDefaultScoringConfig = (): ScoringConfig => {
  const config: ScoringConfig = {};
  Object.entries(SCORING_ACTIONS).forEach(([key, value]) => {
    config[key] = value.points;
  });
  return config;
};

export const getPoints = (
  actionKey: string, 
  scoringConfig: ScoringConfig | null | undefined
): number => {
  if (scoringConfig && scoringConfig[actionKey] !== undefined) {
    return scoringConfig[actionKey];
  }
  const action = SCORING_ACTIONS[actionKey as keyof typeof SCORING_ACTIONS];
  return action?.points ?? 0;
};

export const getMergedConfig = (
  customConfig: ScoringConfig | null | undefined
): ScoringConfig => {
  return { ...getDefaultScoringConfig(), ...(customConfig || {}) };
};
