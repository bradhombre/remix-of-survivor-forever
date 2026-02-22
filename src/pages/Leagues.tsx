import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, LogOut, Crown, Shield, User, Settings, Trophy, Target, Trash2, MoreVertical, Bug } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateLeagueDialog } from '@/components/CreateLeagueDialog';
import { JoinLeagueDialog } from '@/components/JoinLeagueDialog';
import { DonateButton } from '@/components/DonateButton';
import { BugReportDialog } from '@/components/BugReportDialog';
import { toast } from 'sonner';

interface LeagueMembership {
  id: string;
  role: string;
  leagues: {
    id: string;
    name: string;
    invite_code: string;
  } | null;
}

export default function Leagues() {
  const [memberships, setMemberships] = useState<LeagueMembership[]>([]);
  const [gameTypes, setGameTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user, signOut, loading: authLoading } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to finish loading before making decisions
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchMemberships();
  }, [user, authLoading, navigate]);

  const fetchMemberships = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('league_memberships')
      .select(`
        id,
        role,
        leagues (
          id,
          name,
          invite_code
        )
      `)
      .eq('user_id', user.id)
      .not('league_id', 'is', null);

    if (error) {
      toast.error('Failed to load leagues');
      console.error(error);
    } else {
      setMemberships((data as LeagueMembership[]) || []);
      
      // Fetch game types for each league
      const leagueIds = (data as LeagueMembership[])
        .filter(m => m.leagues)
        .map(m => m.leagues!.id);
      
      if (leagueIds.length > 0) {
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('league_id, game_type')
          .in('league_id', leagueIds)
          .order('created_at', { ascending: false });
        
        if (sessions) {
          const typeMap: Record<string, string> = {};
          sessions.forEach((s: any) => {
            if (s.league_id && !typeMap[s.league_id]) {
              typeMap[s.league_id] = s.game_type || 'full';
            }
          });
          setGameTypes(typeMap);
        }
      }
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-my-account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to delete account');
      await signOut();
      navigate('/auth');
      toast.success('Your account has been deleted.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'league_admin':
        return <Crown className="h-3 w-3" />;
      case 'moderator':
        return <Shield className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'league_admin':
        return 'League Admin';
      case 'moderator':
        return 'Moderator';
      case 'player':
        return 'Player';
      default:
        return role;
    }
  };

  const getRoleVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
      case 'super_admin':
      case 'league_admin':
        return 'default';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading leagues...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Survivors Ready" className="h-8 w-auto" />
            <h1 className="text-2xl font-bold text-foreground">My Leagues</h1>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBugOpen(true)}>
                  <Bug className="h-4 w-4 mr-2" />
                  Report a Bug
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-3 mb-8">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create League
          </Button>
          <Button variant="outline" onClick={() => setJoinOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Join League
          </Button>
        </div>

        {memberships.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-3">Welcome to Survivors Ready!</h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Draft contestants, earn points, and compete with friends to see who has the best Survivor instincts.
              </p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 max-w-2xl w-full">
              <Card 
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group"
                onClick={() => setCreateOpen(true)}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Crown className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Create a League</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm mb-4">
                    Start your own fantasy league and invite friends. You'll be the league admin with full control over settings and gameplay.
                  </p>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create League
                  </Button>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group"
                onClick={() => setJoinOpen(true)}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-secondary transition-colors">
                    <Users className="h-7 w-7 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-xl">Join a League</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm mb-4">
                    Have an invite code? Join an existing league and start competing with your group right away.
                  </p>
                  <Button variant="outline" className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Join League
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((membership) => (
              membership.leagues && (
                <Card 
                  key={membership.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/league/${membership.leagues!.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{membership.leagues.name}</CardTitle>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={getRoleVariant(membership.role)} className="flex items-center gap-1">
                          {getRoleIcon(membership.role)}
                          {getRoleLabel(membership.role)}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          {gameTypes[membership.leagues.id] === 'winner_takes_all' ? (
                            <><Target className="h-3 w-3" />WTA</>
                          ) : (
                            <><Trophy className="h-3 w-3" />Fantasy</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(membership.role === 'league_admin' || membership.role === 'super_admin') && (
                      <p className="text-xs text-muted-foreground">
                        Invite code: <span className="font-mono">{membership.leagues.invite_code}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        )}
      </main>

      <footer className="container mx-auto px-4 py-6 flex justify-center border-t border-border">
        <DonateButton />
      </footer>

      <CreateLeagueDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen}
        onSuccess={(leagueId) => navigate(`/league/${leagueId}`)}
      />
      <JoinLeagueDialog 
        open={joinOpen} 
        onOpenChange={setJoinOpen}
        onSuccess={(leagueId) => navigate(`/league/${leagueId}`)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and remove you from all leagues. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BugReportDialog open={bugOpen} onOpenChange={setBugOpen} />
    </div>
  );
}
