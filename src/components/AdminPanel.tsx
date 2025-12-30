import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Trash2, UserPlus, AlertTriangle, RefreshCw, Edit, Users, Settings, Scale, Database } from 'lucide-react';
import { UserPlayerMappingSection } from './UserPlayerMappingSection';
import { ScoringSettings } from './ScoringSettings';
import { SetupMode } from './SetupMode';
import { Contestant, DraftType, Player } from '@/types/survivor';

type UserWithRole = {
  id: string;
  email: string;
  role: 'admin' | 'user';
};

type ContestantRow = {
  id: string;
  name: string;
  tribe?: string;
  owner?: string | null;
  pick_number?: number | null;
  is_eliminated: boolean;
};

type AdminPanelProps = {
  leagueId: string;
  currentEpisode: number;
  // Setup mode props
  season: number;
  contestants: Contestant[];
  draftOrder: Player[];
  draftType: DraftType;
  onSeasonChange: (season: number) => void;
  onAddContestant: (name: string, tribe?: string, age?: number, location?: string) => void;
  onUpdateContestant: (id: string, updates: Partial<Contestant>) => void;
  onDeleteContestant: (id: string) => void;
  onRandomizeDraftOrder: () => void;
  onSetDraftOrder: (order: Player[]) => void;
  onDraftTypeChange: (type: DraftType) => void;
  onStartDraft: () => void;
  onImport: (data: string) => void;
  onExport: () => void;
  onSetContestants: (contestants: Contestant[]) => void;
  // Data management props
  onClearScores?: () => void;
  onClearEpisodeScores?: (episode: number) => void;
  onClearHistory?: () => void;
  onResetAll?: () => void;
  onNewSeason?: () => void;
};

export function AdminPanel({ 
  leagueId,
  currentEpisode, 
  season,
  contestants,
  draftOrder,
  draftType,
  onSeasonChange,
  onAddContestant,
  onUpdateContestant,
  onDeleteContestant,
  onRandomizeDraftOrder,
  onSetDraftOrder,
  onDraftTypeChange,
  onStartDraft,
  onImport,
  onExport,
  onSetContestants,
  onClearScores, 
  onClearEpisodeScores, 
  onClearHistory, 
  onResetAll, 
  onNewSeason 
}: AdminPanelProps) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState(currentEpisode);
  const [isLoading, setIsLoading] = useState(false);
  const [contestantRows, setContestantRows] = useState<ContestantRow[]>([]);
  const [editingContestant, setEditingContestant] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadContestants();
  }, []);

  const loadContestants = async () => {
    const { data: sessionData } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!sessionData) return;

    const { data, error } = await supabase
      .from('contestants')
      .select('*')
      .eq('session_id', sessionData.id)
      .order('pick_number', { ascending: true });

    if (!error && data) {
      setContestantRows(data);
    }
  };

  const loadUsers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'listUsers' }
    });

    if (!error && data?.data) {
      setUsers(data.data);
    }
  };

  const createUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-users', {
        body: { 
          action: 'createUser',
          email: newUserEmail,
          password: newUserPassword
        }
      });

      if (error) throw error;

      toast.success(`User created: ${newUserEmail}`);
      setNewUserEmail('');
      setNewUserPassword('');
      loadUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdmin = async (userId: string, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const action = currentRole === 'admin' ? 'removeAdminRole' : 'addAdminRole';

    const { error } = await supabase.functions.invoke('admin-users', {
      body: { action, userId }
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Role updated to ${newRole}`);
    loadUsers();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    const { error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'deleteUser', userId }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('User deleted');
      loadUsers();
    }
  };

  const handleClearScores = () => {
    if (!confirm('Clear all scoring events for the current season? This cannot be undone.')) return;
    onClearScores?.();
    toast.success('Current season scores cleared');
  };

  const handleClearEpisodeScores = () => {
    if (!confirm(`Clear all scoring events for Episode ${selectedEpisode}? This cannot be undone.`)) return;
    onClearEpisodeScores?.(selectedEpisode);
    toast.success(`Episode ${selectedEpisode} scores cleared`);
  };

  const handleClearHistory = () => {
    if (!confirm('Delete all archived seasons? This cannot be undone.')) return;
    onClearHistory?.();
    toast.success('Season history cleared');
  };

  const handleResetAll = () => {
    if (!confirm('Reset EVERYTHING? This will clear all game data and start fresh. This cannot be undone.')) return;
    onResetAll?.();
    toast.success('All game data reset');
  };

  const handleNewSeason = () => {
    onNewSeason?.();
  };

  const updateContestantOwner = async (contestantId: string, owner: string | null) => {
    const { error } = await supabase
      .from('contestants')
      .update({ owner })
      .eq('id', contestantId);

    if (error) {
      toast.error('Failed to update owner');
    } else {
      toast.success('Owner updated');
      loadContestants();
    }
  };

  const updateContestantPickNumber = async (contestantId: string, pickNumber: number | null) => {
    const { error } = await supabase
      .from('contestants')
      .update({ pick_number: pickNumber })
      .eq('id', contestantId);

    if (error) {
      toast.error('Failed to update pick number');
    } else {
      toast.success('Pick number updated');
      loadContestants();
    }
  };

  const deleteContestantFromDB = async (contestantId: string) => {
    if (!confirm('Are you sure you want to delete this contestant?')) return;

    const { error } = await supabase
      .from('contestants')
      .delete()
      .eq('id', contestantId);

    if (error) {
      toast.error('Failed to delete contestant');
    } else {
      toast.success('Contestant deleted');
      loadContestants();
    }
  };

  const cleanupDuplicates = async () => {
    if (!confirm('Remove duplicate contestants from the database? This will keep the best version of each contestant.')) return;
    
    setIsLoading(true);
    try {
      const { data: allContestants, error } = await supabase
        .from('contestants')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const contestantsByName = new Map<string, any[]>();
      allContestants?.forEach((c) => {
        if (!contestantsByName.has(c.name)) {
          contestantsByName.set(c.name, []);
        }
        contestantsByName.get(c.name)!.push(c);
      });

      const idsToDelete: string[] = [];
      contestantsByName.forEach((contestants) => {
        if (contestants.length > 1) {
          contestants.sort((a, b) => {
            if (a.owner && !b.owner) return -1;
            if (!a.owner && b.owner) return 1;
            if (!a.is_eliminated && b.is_eliminated) return -1;
            if (a.is_eliminated && !b.is_eliminated) return 1;
            if (a.pick_number && !b.pick_number) return -1;
            if (!a.pick_number && b.pick_number) return 1;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
          
          idsToDelete.push(...contestants.slice(1).map(c => c.id));
        }
      });

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('contestants')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;

        toast.success(`Removed ${idsToDelete.length} duplicate contestants`);
      } else {
        toast.success('No duplicates found');
      }
    } catch (error: any) {
      console.error('Error cleaning duplicates:', error);
      toast.error('Failed to clean duplicates');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="scoring" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Scoring
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-6">
          <SetupMode
            leagueId={leagueId}
            season={season}
            contestants={contestants}
            draftOrder={draftOrder}
            draftType={draftType}
            onSeasonChange={onSeasonChange}
            onAddContestant={onAddContestant}
            onUpdateContestant={onUpdateContestant}
            onDeleteContestant={onDeleteContestant}
            onRandomizeDraftOrder={onRandomizeDraftOrder}
            onSetDraftOrder={onSetDraftOrder}
            onDraftTypeChange={onDraftTypeChange}
            onStartDraft={onStartDraft}
            onImport={onImport}
            onExport={onExport}
            onSetContestants={onSetContestants}
          />
        </TabsContent>

        <TabsContent value="scoring" className="mt-6">
          <div className="container max-w-4xl mx-auto">
            <ScoringSettings leagueId={leagueId} />
          </div>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <div className="container max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contestant Management
                </CardTitle>
                <CardDescription>
                  Fix contestant assignments, owners, and pick numbers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {contestantRows.map((contestant) => (
                    <div
                      key={contestant.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{contestant.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {contestant.tribe && `${contestant.tribe} • `}
                          Pick #{contestant.pick_number || 'Undrafted'}
                          {contestant.is_eliminated && ' • Eliminated'}
                        </div>
                      </div>

                      {editingContestant === contestant.id ? (
                        <div className="flex gap-2 items-center">
                          <Select
                            value={contestant.owner || 'none'}
                            onValueChange={(value) =>
                              updateContestantOwner(contestant.id, value === 'none' ? null : value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {draftOrder.map((player) => (
                                <SelectItem key={String(player)} value={String(player)}>
                                  {String(player)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            type="number"
                            min="1"
                            max="20"
                            placeholder="Pick #"
                            value={contestant.pick_number || ''}
                            onChange={(e) =>
                              updateContestantPickNumber(
                                contestant.id,
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="w-20"
                          />

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingContestant(null)}
                          >
                            Done
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <Badge variant={contestant.owner ? 'default' : 'secondary'}>
                            {contestant.owner || 'Undrafted'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingContestant(contestant.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteContestantFromDB(contestant.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Invite New User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                  <Button onClick={createUser} disabled={isLoading}>
                    Create User
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{user.email}</span>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAdmin(user.id, user.role)}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User-Player Assignments
                </CardTitle>
                <CardDescription>
                  Assign each user account to control a specific player
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserPlayerMappingSection users={users} onMappingUpdate={loadUsers} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  Season Management
                </CardTitle>
                <CardDescription>
                  Archive current season and start a new one
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="default"
                  className="w-full justify-start"
                  onClick={handleNewSeason}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start New Season (Archive Current)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Game Data Management
                </CardTitle>
                <CardDescription>
                  Clear game data - these actions cannot be undone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={cleanupDuplicates}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clean Up Duplicate Contestants
                  </Button>
                  
                  <div className="space-y-2">
                    <Label htmlFor="episode-select">Clear Specific Episode</Label>
                    <div className="flex gap-2">
                      <Input
                        id="episode-select"
                        type="number"
                        min="1"
                        value={selectedEpisode}
                        onChange={(e) => setSelectedEpisode(parseInt(e.target.value) || 1)}
                        className="w-24"
                      />
                      <Button
                        variant="outline"
                        onClick={handleClearEpisodeScores}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Episode {selectedEpisode}
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleClearScores}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Season Scores
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleClearHistory}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Season History
                  </Button>
                </div>
                
                <Separator />
                
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={handleResetAll}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reset All Game Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
