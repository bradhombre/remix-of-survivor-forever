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
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { z } from 'zod';
import { TeamAvatarUpload } from './TeamAvatarUpload';
import { CheckCircle2, Trophy, Target, Plus, Minus, Users, Download, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { GameType } from '@/types/survivor';

const leagueSchema = z.object({
  name: z.string().trim().min(1, 'League name is required').max(50, 'League name must be 50 characters or less'),
});

interface CreateLeagueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (leagueId: string) => void;
}

type WizardStep = 1 | 2 | 3 | 4;

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={`h-2 rounded-full transition-all ${
            step === current
              ? 'w-8 bg-primary'
              : step < current
              ? 'w-2 bg-primary/60'
              : 'w-2 bg-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

export function CreateLeagueDialog({ open, onOpenChange, onSuccess }: CreateLeagueDialogProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [name, setName] = useState('');
  const [gameType, setGameType] = useState<GameType>('full');
  const [loading, setLoading] = useState(false);
  
  // Step 2 state - League Settings
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [leagueSize, setLeagueSize] = useState(4);
  const [picksPerTeamOverride, setPicksPerTeamOverride] = useState<number | null>(null);
  const [seasonNumber, setSeasonNumber] = useState(50);
  const [savingSettings, setSavingSettings] = useState(false);

  // Step 3 state - Import Cast
  const [importingCast, setImportingCast] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  // Step 4 state - Team customization
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
      setSessionId(null);
      setLeagueSize(4);
      setPicksPerTeamOverride(null);
      setSeasonNumber(50);
      setImportingCast(false);
      setImportedCount(null);
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
      
      // Fetch the game session for this league
      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('league_id', data.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (sessionData) {
        setSessionId(sessionData.id);
        
        // If winner_takes_all, update the game session
        if (gameType === 'winner_takes_all') {
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

  const handleSaveSettings = async () => {
    if (!leagueId || !sessionId) return;
    
    setSavingSettings(true);
    try {
      // Resize league if different from default 4
      if (leagueSize !== 4) {
        await supabase.rpc('resize_league', { 
          league_uuid: leagueId, 
          new_size: leagueSize 
        });
      }

      // Update session settings
      const updates: Record<string, any> = { season: seasonNumber };
      if (picksPerTeamOverride !== null) {
        updates.picks_per_team = picksPerTeamOverride;
      }
      await supabase
        .from('game_sessions')
        .update(updates)
        .eq('id', sessionId);

      setStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleImportCast = async () => {
    if (!sessionId) return;
    
    setImportingCast(true);
    try {
      const { data: masterCast, error } = await supabase
        .from('master_contestants')
        .select('name, tribe, age, occupation, image_url')
        .eq('season_number', seasonNumber);

      if (error) throw error;

      if (!masterCast || masterCast.length === 0) {
        toast.error(`No official cast found for Season ${seasonNumber}`);
        setImportingCast(false);
        return;
      }

      // Insert contestants
      const contestantsToInsert = masterCast.map(mc => ({
        session_id: sessionId,
        name: mc.name,
        tribe: mc.tribe || null,
        age: mc.age || null,
        location: mc.occupation || null,
        image_url: mc.image_url || null,
      }));

      const { error: insertError } = await supabase
        .from('contestants')
        .insert(contestantsToInsert);

      if (insertError) throw insertError;

      setImportedCount(masterCast.length);
      toast.success(`Imported ${masterCast.length} contestants for Season ${seasonNumber}`);
    } catch (err: any) {
      toast.error('Failed to import cast');
      console.error(err);
    } finally {
      setImportingCast(false);
    }
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

  const handleFinish = () => {
    onOpenChange(false);
    if (leagueId) {
      onSuccess(leagueId);
    }
  };

  const defaultPicks = gameType === 'winner_takes_all' ? 1 : Math.max(1, Math.floor(18 / leagueSize));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <StepIndicator current={step} total={4} />

        {/* Step 1: Name & Game Type */}
        {step === 1 && (
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
                    <p className="text-xs text-muted-foreground">Pick who wins</p>
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Next'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Step 2: League Settings */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>League Settings</DialogTitle>
              <DialogDescription>
                Configure your league size and draft settings. You can always change these later in Admin Settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              {/* League Size */}
              <div className="space-y-2">
                <Label>Number of Players</Label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    onClick={() => setLeagueSize(Math.max(2, leagueSize - 1))}
                    variant="outline"
                    size="icon"
                    disabled={leagueSize <= 2}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-3xl font-bold text-primary min-w-[48px] text-center">
                    {leagueSize}
                  </span>
                  <Button
                    onClick={() => setLeagueSize(Math.min(20, leagueSize + 1))}
                    variant="outline"
                    size="icon"
                    disabled={leagueSize >= 20}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Picks Per Team */}
              <div className="space-y-2">
                <Label>Picks Per Team</Label>
                <p className="text-xs text-muted-foreground">
                  {gameType === 'winner_takes_all'
                    ? 'How many Sole Survivor predictions each player gets'
                    : `Suggested: ${defaultPicks} per team`}
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={picksPerTeamOverride ?? defaultPicks}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1) {
                        setPicksPerTeamOverride(val);
                      }
                    }}
                    className="w-24"
                  />
                  {picksPerTeamOverride !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPicksPerTeamOverride(null)}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Season Number */}
              <div className="space-y-2">
                <Label htmlFor="season-number">Season Number</Label>
                <Input
                  id="season-number"
                  type="number"
                  min={1}
                  value={seasonNumber}
                  onChange={(e) => setSeasonNumber(parseInt(e.target.value) || 1)}
                  className="w-24"
                />
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? 'Saving...' : 'Next'}
                {!savingSettings && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Import Cast */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Import Cast</DialogTitle>
              <DialogDescription>
                Import the official cast for Season {seasonNumber}, or add contestants manually later in Admin Settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {importedCount !== null ? (
                <Card className="p-4 text-center space-y-2 border-success/30 bg-success/5">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
                  <p className="font-semibold">{importedCount} contestants imported!</p>
                  <p className="text-sm text-muted-foreground">You can manage them in Admin Settings.</p>
                </Card>
              ) : (
                <div className="text-center space-y-4">
                  <Button
                    onClick={handleImportCast}
                    disabled={importingCast}
                    className="gap-2"
                    size="lg"
                  >
                    {importingCast ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {importingCast ? 'Importing...' : `Import Season ${seasonNumber} Cast`}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Or skip this step and add contestants manually later.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(4)}>
                {importedCount !== null ? 'Next' : 'Skip'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Customize Team */}
        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Customize Your Team
              </DialogTitle>
              <DialogDescription>
                Give your team a name and upload a photo to make it yours! You can always change this later.
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
            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleFinish}>
                  Skip for now
                </Button>
                <Button onClick={handleSaveTeam} disabled={savingTeam || !teamName.trim()}>
                  {savingTeam ? 'Saving...' : 'Done'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
