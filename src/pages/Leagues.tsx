import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, LogOut, Crown, Shield, User } from 'lucide-react';
import { CreateLeagueDialog } from '@/components/CreateLeagueDialog';
import { JoinLeagueDialog } from '@/components/JoinLeagueDialog';
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
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchMemberships();
  }, [user, navigate]);

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
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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

  if (loading) {
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
          <h1 className="text-2xl font-bold text-foreground">My Leagues</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
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
          <Card className="max-w-md mx-auto mt-16">
            <CardContent className="pt-6 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Leagues Yet</h2>
              <p className="text-muted-foreground mb-6">
                Create a new league to start playing with friends, or join an existing one with an invite code.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create League
                </Button>
                <Button variant="outline" onClick={() => setJoinOpen(true)}>
                  Join League
                </Button>
              </div>
            </CardContent>
          </Card>
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
                      <Badge variant={getRoleVariant(membership.role)} className="flex items-center gap-1">
                        {getRoleIcon(membership.role)}
                        {getRoleLabel(membership.role)}
                      </Badge>
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
    </div>
  );
}
