import { SCORING_ACTIONS } from "@/types/survivor";

// Custom scoring action created by league admins
export interface CustomScoringAction {
  id: string;
  label: string;
  emoji: string;
  points: number;
}

// ScoringConfig can have:
// - number: enabled with custom points
// - null: disabled (action not available)
// - undefined/missing: use default points from SCORING_ACTIONS
// - custom_actions: array of custom actions created by admins
export type ScoringConfig = Record<string, number | null | CustomScoringAction[]>;

export const getDefaultScoringConfig = (): ScoringConfig => {
  const config: ScoringConfig = {};
  Object.entries(SCORING_ACTIONS).forEach(([key, value]) => {
    config[key] = value.points;
  });
  return config;
};

/**
 * Check if a scoring action is enabled
 * Returns false if the action is explicitly set to null
 */
export const isActionEnabled = (
  actionKey: string,
  scoringConfig: ScoringConfig | null | undefined
): boolean => {
  if (!scoringConfig) return true;
  // Explicitly disabled if set to null
  if (scoringConfig[actionKey] === null) return false;
  return true;
};

/**
 * Get points for an action
 * Returns null if action is disabled, otherwise returns the point value
 */
export const getPoints = (
  actionKey: string, 
  scoringConfig: ScoringConfig | null | undefined
): number => {
  if (scoringConfig && scoringConfig[actionKey] !== undefined) {
    // If disabled (null), return 0
    if (scoringConfig[actionKey] === null) return 0;
    return scoringConfig[actionKey] as number;
  }
  const action = SCORING_ACTIONS[actionKey as keyof typeof SCORING_ACTIONS];
  return action?.points ?? 0;
};

/**
 * Get merged config with defaults, preserving null values for disabled actions
 */
export const getMergedConfig = (
  customConfig: ScoringConfig | null | undefined
): ScoringConfig => {
  const defaults = getDefaultScoringConfig();
  if (!customConfig) return defaults;
  
  // Merge but preserve null values from custom config
  const merged: ScoringConfig = { ...defaults };
  Object.entries(customConfig).forEach(([key, value]) => {
    merged[key] = value;
  });
  return merged;
};

/**
 * Get all enabled actions with their point values
 */
export const getEnabledActions = (
  scoringConfig: ScoringConfig | null | undefined
): Record<string, { points: number; label: string; emoji: string }> => {
  const enabled: Record<string, { points: number; label: string; emoji: string }> = {};
  
  Object.entries(SCORING_ACTIONS).forEach(([key, action]) => {
    if (isActionEnabled(key, scoringConfig)) {
      enabled[key] = {
        ...action,
        points: getPoints(key, scoringConfig),
      };
    }
  });
  
  return enabled;
};

/**
 * Get custom actions from scoring config
 */
export const getCustomActions = (
  scoringConfig: ScoringConfig | null | undefined
): CustomScoringAction[] => {
  if (!scoringConfig) return [];
  const customActions = scoringConfig.custom_actions;
  if (Array.isArray(customActions)) {
    return customActions as CustomScoringAction[];
  }
  return [];
};

/**
 * Add a custom action to the scoring config
 */
export const addCustomAction = (
  scoringConfig: ScoringConfig,
  action: CustomScoringAction
): ScoringConfig => {
  const existing = getCustomActions(scoringConfig);
  return {
    ...scoringConfig,
    custom_actions: [...existing, action] as unknown as CustomScoringAction[],
  };
};

/**
 * Remove a custom action from the scoring config
 */
export const removeCustomAction = (
  scoringConfig: ScoringConfig,
  actionId: string
): ScoringConfig => {
  const existing = getCustomActions(scoringConfig);
  return {
    ...scoringConfig,
    custom_actions: existing.filter(a => a.id !== actionId) as unknown as CustomScoringAction[],
  };
};

/**
 * Update a custom action in the scoring config
 */
export const updateCustomAction = (
  scoringConfig: ScoringConfig,
  actionId: string,
  updates: Partial<CustomScoringAction>
): ScoringConfig => {
  const existing = getCustomActions(scoringConfig);
  return {
    ...scoringConfig,
    custom_actions: existing.map(a => 
      a.id === actionId ? { ...a, ...updates } : a
    ) as unknown as CustomScoringAction[],
  };
};
