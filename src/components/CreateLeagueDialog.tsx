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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import { TeamAvatarUpload } from './TeamAvatarUpload';
import { CheckCircle2, Trophy, Target } from 'lucide-react';
import { GameType } from '@/types/survivor';

const leagueSchema = z.object({
  name: z.string().trim().min(1, 'League name is required').max(50, 'League name must be 50 characters or less'),
});

interface CreateLeagueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (leagueId: string) => void;
}

export function CreateLeagueDialog({ open, onOpenChange, onSuccess }: CreateLeagueDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [gameType, setGameType] = useState<GameType>('full');
  const [loading, setLoading] = useState(false);
  
  // Step 2 state
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamAvatarUrl, setTeamAvatarUrl] = useState<string | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setName('');
      setGameType('full');
      setLeagueId(null);
      setTeamId(null);
      setTeamName('');
      setTeamAvatarUrl(null);
    }
  }, [open]);

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      leagueSchema.parse({ name });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('create_league', { league_name: name.trim() });

    if (error) {
      toast.error(error.message || 'Failed to create league');
      setLoading(false);
      return;
    }

    if (data?.id) {
      setLeagueId(data.id);
      
      // If winner_takes_all, update the game session
      if (gameType === 'winner_takes_all') {
        const { data: sessionData } = await supabase
          .from('game_sessions')
          .select('id')
          .eq('league_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (sessionData) {
          await supabase
            .from('game_sessions')
            .update({ game_type: gameType } as any)
            .eq('id', sessionData.id);
        }
      }

      // Fetch the user's team
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: teamData } = await supabase
          .from('league_teams')
          .select('id, name, avatar_url')
          .eq('league_id', data.id)
          .eq('user_id', user.id)
          .single();
        
        if (teamData) {
          setTeamId(teamData.id);
          setTeamName(teamData.name);
          setTeamAvatarUrl((teamData as any).avatar_url || null);
        }
      }
      
      setStep(2);
      toast.success('League created!');
    }
    setLoading(false);
  };

  const handleSaveTeam = async () => {
    if (!teamId || !teamName.trim()) return;
    
    setSavingTeam(true);
    const { error } = await supabase
      .from('league_teams')
      .update({ name: teamName.trim() })
      .eq('id', teamId);

    if (error) {
      toast.error('Failed to update team name');
      setSavingTeam(false);
      return;
    }

    toast.success('Team customized!');
    setSavingTeam(false);
    onOpenChange(false);
    if (leagueId) {
      onSuccess(leagueId);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    if (leagueId) {
      onSuccess(leagueId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Create a New League</DialogTitle>
              <DialogDescription>
                Start a new fantasy league and invite your friends to join.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLeague} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="league-name">League Name</Label>
                <Input
                  id="league-name"
                  placeholder="e.g., Survivor Squad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Game Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGameType('full')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      gameType === 'full'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">Full Fantasy</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Track points every episode</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameType('winner_takes_all')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      gameType === 'winner_takes_all'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-sm">Winner Takes All</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Just pick who wins</p>
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create League'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                You're in! Customize Your Team
              </DialogTitle>
              <DialogDescription>
                You've been assigned to Team 1. Give your team a name and upload a photo to make it yours!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Avatar upload */}
              <div className="flex justify-center">
                {teamId && leagueId && (
                  <TeamAvatarUpload
                    teamId={teamId}
                    leagueId={leagueId}
                    currentAvatarUrl={teamAvatarUrl}
                    teamName={teamName}
                    onUploadComplete={setTeamAvatarUrl}
                    size="lg"
                  />
                )}
              </div>

              {/* Team name */}
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  placeholder="e.g., The Tribal Council"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
              <Button onClick={handleSaveTeam} disabled={savingTeam || !teamName.trim()}>
                {savingTeam ? 'Saving...' : 'Done'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
