import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Team {
  id: string;
  name: string;
  position: number;
  user_id: string | null;
}

interface TeamSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: string;
  onTeamSelected: () => void;
}

export function TeamSelectionDialog({
  open,
  onOpenChange,
  leagueId,
  onTeamSelected,
}: TeamSelectionDialogProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvailableTeams = async () => {
      if (!open || !leagueId) return;

      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_available_teams', { league_uuid: leagueId });

      if (error) {
        console.error('Error fetching teams:', error);
        toast.error('Failed to load available teams');
      } else {
        setTeams(data || []);
      }
      setLoading(false);
    };

    fetchAvailableTeams();
  }, [open, leagueId]);

  const handleClaimTeam = async (teamId: string) => {
    setClaiming(teamId);

    try {
      const { error } = await supabase.rpc('claim_team', { team_id: teamId });

      if (error) {
        if (error.message.includes('already claimed')) {
          toast.error('This team was just claimed by someone else');
          // Refresh the list
          const { data } = await supabase.rpc('get_available_teams', { league_uuid: leagueId });
          setTeams(data || []);
        } else if (error.message.includes('already have a team')) {
          toast.error('You already have a team in this league');
          onTeamSelected();
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Team claimed successfully!');
        onTeamSelected();
      }
    } catch (err) {
      toast.error('Failed to claim team');
    } finally {
      setClaiming(null);
    }
  };

  const teamColors = [
    'bg-primary/10 border-primary hover:bg-primary/20',
    'bg-secondary/10 border-secondary hover:bg-secondary/20',
    'bg-accent/10 border-accent hover:bg-accent/20',
    'bg-success/10 border-success hover:bg-success/20',
    'bg-destructive/10 border-destructive hover:bg-destructive/20',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Choose Your Team
          </DialogTitle>
          <DialogDescription>
            Select a team to join this league. You'll draft and score points for this team.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No teams available. All teams have been claimed.
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="mt-4"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 py-4">
            {teams.map((team, index) => (
              <Button
                key={team.id}
                onClick={() => handleClaimTeam(team.id)}
                disabled={claiming !== null}
                variant="outline"
                className={`h-auto py-4 px-4 justify-start border-2 transition-all ${
                  teamColors[index % teamColors.length]
                } ${claiming === team.id ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-lg">{team.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Position #{team.position}
                    </p>
                  </div>
                  {claiming === team.id && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                </div>
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
