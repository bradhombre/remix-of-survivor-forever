

# Fix: Custom Scoring Actions Not Showing in Game Mode

## Problem
The `scoringConfig` state in `useGameStateDB.ts` is typed as `Record<string, number> | null`. When the config is loaded from the database, it's cast to `Record<string, number>`, which silently drops the `custom_actions` array (since it's not a `number` value). As a result, `getCustomActions(scoringConfig)` in `GameMode` always returns an empty array -- your custom scoring actions are invisible during gameplay.

## Solution
Widen the type of `scoringConfig` in `useGameStateDB.ts` to use the proper `ScoringConfig` type from `src/lib/scoring.ts`, which allows values to be `number | null | CustomScoringAction[]`. This preserves the `custom_actions` array when loaded from the database.

## Changes

**File: `src/hooks/useGameStateDB.ts`**

1. Import `ScoringConfig` from `@/lib/scoring`
2. Change the state declaration from:
   ```typescript
   const [scoringConfig, setScoringConfig] = useState<Record<string, number> | null>(null);
   ```
   to:
   ```typescript
   const [scoringConfig, setScoringConfig] = useState<ScoringConfig | null>(null);
   ```
3. Update the cast when loading from DB (line 106) from:
   ```typescript
   setScoringConfig(leagueData.scoring_config as Record<string, number>);
   ```
   to:
   ```typescript
   setScoringConfig(leagueData.scoring_config as ScoringConfig);
   ```

This is a two-line type fix that lets the existing `custom_actions` data flow through to the UI correctly.

