import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import { TeamSelectionDialog } from './TeamSelectionDialog';

const inviteCodeSchema = z.object({
  code: z.string().trim().length(6, 'Invite code must be 6 characters'),
});

interface JoinLeagueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (leagueId: string) => void;
}

export function JoinLeagueDialog({ open, onOpenChange, onSuccess }: JoinLeagueDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [joinedLeagueId, setJoinedLeagueId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      inviteCodeSchema.parse({ code });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('join_league', { invite_code_input: code.trim().toUpperCase() });

    if (error) {
      if (error.message.includes('Invalid invite code')) {
        toast.error('Invalid invite code. Please check and try again.');
      } else if (error.message.includes('Already a member')) {
        toast.error('You are already a member of this league.');
      } else {
        toast.error(error.message || 'Failed to join league');
      }
      setLoading(false);
    } else if (data?.league_id) {
      const leagueId = data.league_id;
      setJoinedLeagueId(leagueId);
      
      // Check if there are available teams to claim
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user already has a team
        const { data: userTeam } = await supabase
          .from('league_teams')
          .select('id')
          .eq('league_id', leagueId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!userTeam) {
          // Check for available teams
          const { data: availableTeams } = await supabase
            .rpc('get_available_teams', { league_uuid: leagueId });

          if (availableTeams && availableTeams.length > 0) {
            // Show team selection dialog
            setShowTeamSelection(true);
            setLoading(false);
            return;
          }
        }
      }

      // No team selection needed
      toast.success('Successfully joined the league!');
      setCode('');
      onOpenChange(false);
      onSuccess(leagueId);
      setLoading(false);
    }
  };

  const handleTeamSelected = () => {
    setShowTeamSelection(false);
    toast.success('Successfully joined the league!');
    setCode('');
    onOpenChange(false);
    if (joinedLeagueId) {
      onSuccess(joinedLeagueId);
    }
  };

  return (
    <>
      <Dialog open={open && !showTeamSelection} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join a League</DialogTitle>
            <DialogDescription>
              Enter the 6-character invite code shared by the league admin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="e.g., ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono text-center text-lg tracking-widest"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Joining...' : 'Join League'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {joinedLeagueId && (
        <TeamSelectionDialog
          open={showTeamSelection}
          onOpenChange={(open) => {
            if (!open) {
              setShowTeamSelection(false);
              onOpenChange(false);
              onSuccess(joinedLeagueId);
            }
          }}
          leagueId={joinedLeagueId}
          onTeamSelected={handleTeamSelected}
        />
      )}
    </>
  );
}
