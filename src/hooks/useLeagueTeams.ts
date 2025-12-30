import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeagueTeam {
  id: string;
  league_id: string;
  name: string;
  position: number;
  user_id: string | null;
  user_email?: string | null;
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
        .select('*, profiles:user_id(email)')
        .eq('league_id', leagueId)
        .order('position', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // Flatten the profile email into user_email
      const teamsWithEmail = (data || []).map((team: any) => ({
        id: team.id,
        league_id: team.league_id,
        name: team.name,
        position: team.position,
        user_id: team.user_id,
        user_email: team.profiles?.email || null,
        created_at: team.created_at,
      }));

      setTeams(teamsWithEmail);
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

  const resizeLeague = async (newSize: number) => {
    if (!leagueId) return;

    const { error: resizeError } = await supabase
      .rpc('resize_league', { league_uuid: leagueId, new_size: newSize });

    if (resizeError) {
      throw resizeError;
    }

    // Refetch to get updated teams
    await fetchTeams();
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

  const getFilledCount = () => {
    return teams.filter(t => t.user_id !== null).length;
  };

  const getTeamNames = () => {
    return teams.map(t => t.name);
  };

  return {
    teams,
    loading,
    error,
    resizeLeague,
    renameTeam,
    getFilledCount,
    getTeamNames,
    refetch: fetchTeams,
  };
};
