

## Auto-Refresh for Tribal Vote Predictions

### Problem
When the FinalPredictionDialog is open, players can't see when others have submitted their predictions without manually closing and reopening the dialog.

### Solution
Subscribe to Supabase Realtime on the `final_predictions` table while the dialog is open. This will automatically update the submission status list as each player submits.

### Changes

**`src/components/FinalPredictionDialog.tsx`**
- Add a Realtime subscription in the `useEffect` that fires when the dialog opens
- Listen for `INSERT` and `UPDATE` events on `final_predictions` filtered by `session_id` and `episode`
- On any change, call the existing `loadPredictions()` to refresh the list
- Clean up the subscription when the dialog closes

**Database** (migration needed)
- Enable realtime on `final_predictions`: `ALTER PUBLICATION supabase_realtime ADD TABLE public.final_predictions;`

This is a small, targeted change — roughly 15 lines of code plus a one-line migration.

