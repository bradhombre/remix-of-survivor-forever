import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeagueTeam {
  id: string;
  league_id: string;
  name: string;
  position: number;
  user_id: string | null;
  created_at: string;
}

interface UseLeagueTeamsOptions {
  leagueId?: string;
}

export const useLeagueTeams = (options: UseLeagueTeamsOptions = {}) => {
  const { leagueId } = options;
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!leagueId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('league_teams')
        .select('*')
        .eq('league_id', leagueId)
        .order('position', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setTeams(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Real-time subscription
  useEffect(() => {
    if (!leagueId) return;

    const channel = supabase
      .channel(`league-teams-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'league_teams',
          filter: `league_id=eq.${leagueId}`,
        },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, fetchTeams]);

  const addTeam = async (name: string) => {
    if (!leagueId) return null;

    const maxPosition = teams.length > 0 
      ? Math.max(...teams.map(t => t.position)) 
      : 0;

    const { data, error: insertError } = await supabase
      .from('league_teams')
      .insert({
        league_id: leagueId,
        name,
        position: maxPosition + 1,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return data;
  };

  const removeTeam = async (teamId: string) => {
    if (!leagueId) return;

    const { error: deleteError } = await supabase
      .from('league_teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) {
      throw deleteError;
    }
  };

  const renameTeam = async (teamId: string, newName: string) => {
    if (!leagueId) return;

    const { error: updateError } = await supabase
      .from('league_teams')
      .update({ name: newName })
      .eq('id', teamId);

    if (updateError) {
      throw updateError;
    }
  };

  const claimTeam = async (teamId: string) => {
    const { data, error: claimError } = await supabase
      .rpc('claim_team', { team_id: teamId });

    if (claimError) {
      throw claimError;
    }

    return data;
  };

  const getAvailableTeams = () => {
    return teams.filter(t => t.user_id === null);
  };

  const getUserTeam = (userId: string) => {
    return teams.find(t => t.user_id === userId);
  };

  const getTeamNames = () => {
    return teams.map(t => t.name);
  };

  return {
    teams,
    loading,
    error,
    addTeam,
    removeTeam,
    renameTeam,
    claimTeam,
    getAvailableTeams,
    getUserTeam,
    getTeamNames,
    refetch: fetchTeams,
  };
};
