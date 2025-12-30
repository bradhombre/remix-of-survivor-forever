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

// Scoring template definition
export interface ScoringTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  config: ScoringConfig;
}

// Predefined scoring templates
export const SCORING_TEMPLATES: ScoringTemplate[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Balanced scoring for casual and competitive play",
    emoji: "⚖️",
    config: {
      FIND_IDOL: 100,
      ACQUIRE_IDOL: 50,
      FIND_ADVANTAGE: 50,
      ACQUIRE_ADVANTAGE: 25,
      VOTED_OUT_WITH_IDOL: -50,
      WIN_IMMUNITY: 25,
      CATCH_TOSS: 10,
      DROP_TOSS: -10,
      TRIBAL_VOTE_CORRECT: 10,
      SURVIVE_PRE: 5,
      SURVIVE_POST: 10,
      VOTED_OUT: -25,
      QUIT: -100,
      MAKE_JURY: 50,
      MAKE_FINAL: 100,
      WIN_SURVIVOR: 200,
      CRY: 10,
      EPISODE_TITLE: 25,
      MISC_25: 25,
      MISC_50: 50,
      MISC_NEG_10: -10,
      MISC_NEG_25: -25,
    },
  },
  {
    id: "competitive",
    name: "Competitive",
    description: "Higher stakes with bigger swings and penalties",
    emoji: "🏆",
    config: {
      FIND_IDOL: 150,
      ACQUIRE_IDOL: 75,
      FIND_ADVANTAGE: 75,
      ACQUIRE_ADVANTAGE: 40,
      VOTED_OUT_WITH_IDOL: -100,
      WIN_IMMUNITY: 50,
      CATCH_TOSS: 15,
      DROP_TOSS: -15,
      TRIBAL_VOTE_CORRECT: 20,
      SURVIVE_PRE: 10,
      SURVIVE_POST: 20,
      VOTED_OUT: -50,
      QUIT: -200,
      MAKE_JURY: 75,
      MAKE_FINAL: 150,
      WIN_SURVIVOR: 300,
      CRY: 15,
      EPISODE_TITLE: 50,
      MISC_25: 25,
      MISC_50: 50,
      MISC_NEG_10: -10,
      MISC_NEG_25: -25,
    },
  },
  {
    id: "casual",
    name: "Casual",
    description: "Lower penalties, more forgiving for new players",
    emoji: "🌴",
    config: {
      FIND_IDOL: 75,
      ACQUIRE_IDOL: 40,
      FIND_ADVANTAGE: 40,
      ACQUIRE_ADVANTAGE: 20,
      VOTED_OUT_WITH_IDOL: -25,
      WIN_IMMUNITY: 20,
      CATCH_TOSS: 5,
      DROP_TOSS: -5,
      TRIBAL_VOTE_CORRECT: 5,
      SURVIVE_PRE: 5,
      SURVIVE_POST: 10,
      VOTED_OUT: -10,
      QUIT: -50,
      MAKE_JURY: 40,
      MAKE_FINAL: 75,
      WIN_SURVIVOR: 150,
      CRY: 10,
      EPISODE_TITLE: 20,
      MISC_25: 25,
      MISC_50: 50,
      MISC_NEG_10: -10,
      MISC_NEG_25: -25,
    },
  },
  {
    id: "survival_focused",
    name: "Survival Focused",
    description: "Rewards longevity and making it to the end",
    emoji: "🔥",
    config: {
      FIND_IDOL: 50,
      ACQUIRE_IDOL: 25,
      FIND_ADVANTAGE: 25,
      ACQUIRE_ADVANTAGE: 15,
      VOTED_OUT_WITH_IDOL: -75,
      WIN_IMMUNITY: 40,
      CATCH_TOSS: 5,
      DROP_TOSS: -5,
      TRIBAL_VOTE_CORRECT: 15,
      SURVIVE_PRE: 10,
      SURVIVE_POST: 25,
      VOTED_OUT: -40,
      QUIT: -150,
      MAKE_JURY: 100,
      MAKE_FINAL: 200,
      WIN_SURVIVOR: 400,
      CRY: 5,
      EPISODE_TITLE: 15,
      MISC_25: 25,
      MISC_50: 50,
      MISC_NEG_10: -10,
      MISC_NEG_25: -25,
    },
  },
  {
    id: "idol_hunter",
    name: "Idol Hunter",
    description: "Heavy rewards for finding idols and advantages",
    emoji: "🗿",
    config: {
      FIND_IDOL: 200,
      ACQUIRE_IDOL: 100,
      FIND_ADVANTAGE: 150,
      ACQUIRE_ADVANTAGE: 75,
      VOTED_OUT_WITH_IDOL: -150,
      WIN_IMMUNITY: 20,
      CATCH_TOSS: 10,
      DROP_TOSS: -10,
      TRIBAL_VOTE_CORRECT: 10,
      SURVIVE_PRE: 5,
      SURVIVE_POST: 10,
      VOTED_OUT: -25,
      QUIT: -100,
      MAKE_JURY: 25,
      MAKE_FINAL: 50,
      WIN_SURVIVOR: 150,
      CRY: 10,
      EPISODE_TITLE: 25,
      MISC_25: 25,
      MISC_50: 50,
      MISC_NEG_10: -10,
      MISC_NEG_25: -25,
    },
  },
];

export const getDefaultScoringConfig = (): ScoringConfig => {
  const config: ScoringConfig = {};
  Object.entries(SCORING_ACTIONS).forEach(([key, value]) => {
    config[key] = value.points;
  });
  return config;
};

/**
 * Get a scoring template by ID
 */
export const getScoringTemplate = (templateId: string): ScoringTemplate | undefined => {
  return SCORING_TEMPLATES.find(t => t.id === templateId);
};

/**
 * Apply a template while preserving custom actions
 */
export const applyTemplate = (
  templateId: string,
  existingConfig?: ScoringConfig | null
): ScoringConfig => {
  const template = getScoringTemplate(templateId);
  if (!template) return getDefaultScoringConfig();
  
  // Preserve existing custom actions if any
  const customActions = existingConfig ? getCustomActions(existingConfig) : [];
  
  return {
    ...template.config,
    ...(customActions.length > 0 ? { custom_actions: customActions as unknown as CustomScoringAction[] } : {}),
  };
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
