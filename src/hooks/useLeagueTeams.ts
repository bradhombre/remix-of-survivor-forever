import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeagueTeam {
  id: string;
  league_id: string;
  name: string;
  position: number;
  user_id: string | null;
  user_email?: string | null;
  avatar_url?: string | null;
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
      // Fetch teams without the problematic FK join
      const { data: teamsData, error: fetchError } = await supabase
        .from('league_teams')
        .select('*')
        .eq('league_id', leagueId)
        .order('position', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // Get user IDs that are filled
      const filledUserIds = (teamsData || [])
        .filter(t => t.user_id)
        .map(t => t.user_id as string);

      // Fetch emails separately if there are filled slots
      let emailMap: Record<string, string> = {};
      if (filledUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', filledUserIds);
        
        if (profiles) {
          emailMap = profiles.reduce((acc, p) => {
            acc[p.id] = p.email;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Map teams with emails
      const teamsWithEmail = (teamsData || []).map((team) => ({
        id: team.id,
        league_id: team.league_id,
        name: team.name,
        position: team.position,
        user_id: team.user_id,
        user_email: team.user_id ? emailMap[team.user_id] || null : null,
        avatar_url: (team as any).avatar_url || null,
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

  const updateTeam = async (teamId: string, updates: { name?: string; avatar_url?: string }) => {
    const { error: updateError } = await supabase
      .from('league_teams')
      .update(updates)
      .eq('id', teamId);

    if (updateError) {
      throw updateError;
    }

    // Refetch to update local state
    await fetchTeams();
  };

  const getFilledCount = () => {
    return teams.filter(t => t.user_id !== null).length;
  };

  const getTeamNames = () => {
    return teams.map(t => t.name);
  };

  const getMyTeam = (userId: string | null) => {
    if (!userId) return null;
    return teams.find(t => t.user_id === userId) || null;
  };

  return {
    teams,
    loading,
    error,
    resizeLeague,
    renameTeam,
    updateTeam,
    getFilledCount,
    getTeamNames,
    getMyTeam,
    refetch: fetchTeams,
  };
};
