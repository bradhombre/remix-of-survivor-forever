

## Fix: Team assignment UI not updating without refresh

**Problem**: When unassigning or reassigning members to team slots in the Setup tab, the UI doesn't reflect changes immediately. The `handleAssignMember` function updates the database directly but doesn't trigger a local data refresh, so the UI stays stale until the real-time subscription catches up (which can be delayed or missed entirely).

**Solution**: After each assign/unassign operation, explicitly call `refetch()` from the `useLeagueTeams` hook to immediately reload the team data from the database.

### Changes

**File: `src/components/SetupMode.tsx`**

1. Destructure `refetch` from `useLeagueTeams` (line 79) -- it's already returned by the hook but not currently used in this component.

2. In `handleAssignMember` (lines 216-239), add `await refetch()` after the database updates complete, before showing the toast. This ensures the UI reflects the new assignments immediately.

```typescript
const { teams, loading: teamsLoading, resizeLeague, renameTeam, getFilledCount, refetch } = useLeagueTeams({ leagueId });
```

```typescript
const handleAssignMember = async (teamId: string, userId: string | null) => {
  try {
    if (userId) {
      const existingTeam = teams.find(t => t.user_id === userId);
      if (existingTeam && existingTeam.id !== teamId) {
        await supabase
          .from('league_teams')
          .update({ user_id: null })
          .eq('id', existingTeam.id);
      }
    }
    await supabase
      .from('league_teams')
      .update({ user_id: userId })
      .eq('id', teamId);
    
    // Force immediate refresh of team data
    await refetch();
    
    setAssigningTeamId(null);
    toast({ title: userId ? "Member assigned!" : "Slot unassigned" });
  } catch (err: any) {
    toast({ title: "Assignment failed", description: err.message, variant: "destructive" });
  }
};
```

This is a small, targeted fix -- just two line changes that ensure the team list refreshes immediately after any assignment change.

