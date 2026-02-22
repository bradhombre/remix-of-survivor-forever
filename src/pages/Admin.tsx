import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewsManager } from "@/components/admin/NewsManager";
import { CastManager } from "@/components/admin/CastManager";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { ArrowLeft, Users, Eye, Trash2, Newspaper, UserCircle, Settings, Bug } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface LeagueWithDetails {
  id: string;
  name: string;
  created_at: string;
  owner_email: string;
  member_count: number;
}

interface BugReport {
  id: string;
  user_id: string;
  description: string;
  page_url: string | null;
  status: string;
  created_at: string;
  user_email?: string;
}

export default function Admin() {
  const { isSuperAdmin, loading: roleLoading } = useIsSuperAdmin();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leagues, setLeagues] = useState<LeagueWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bugs, setBugs] = useState<BugReport[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!roleLoading && !isSuperAdmin) {
      navigate("/leagues");
    }
  }, [isSuperAdmin, roleLoading, authLoading, user, navigate]);

  useEffect(() => {
    if (!isSuperAdmin || roleLoading) return;

    fetchLeagues();
    fetchBugs();
  }, [isSuperAdmin, roleLoading]);

  const fetchBugs = async () => {
    const { data } = await supabase
      .from("bug_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (!data) return;
    const userIds = [...new Set(data.map((b: any) => b.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    const emailMap = new Map(profiles?.map((p) => [p.id, p.email]) || []);
    setBugs(
      data.map((b: any) => ({ ...b, user_email: emailMap.get(b.user_id) || "Unknown" }))
    );
  };

  const handleUpdateBugStatus = async (id: string, status: string) => {
    await supabase.from("bug_reports").update({ status }).eq("id", id);
    setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  };

  const fetchLeagues = async () => {
    // Fetch all leagues with owner profiles
    const { data: leaguesData, error: leaguesError } = await supabase
      .from("leagues")
      .select(`
        id,
        name,
        created_at,
        owner_id
      `)
      .order("created_at", { ascending: false });

    if (leaguesError || !leaguesData) {
      console.error("Error fetching leagues:", leaguesError);
      setLoading(false);
      return;
    }

    // Fetch owner emails
    const ownerIds = [...new Set(leaguesData.map((l) => l.owner_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", ownerIds);

    const profileMap = new Map(
      profilesData?.map((p) => [p.id, p.email]) || []
    );

    // Fetch member counts
    const { data: membershipsData } = await supabase
      .from("league_memberships")
      .select("league_id");

    const memberCounts = new Map<string, number>();
    membershipsData?.forEach((m) => {
      if (m.league_id) {
        memberCounts.set(m.league_id, (memberCounts.get(m.league_id) || 0) + 1);
      }
    });

    const leaguesWithDetails: LeagueWithDetails[] = leaguesData.map((league) => ({
      id: league.id,
      name: league.name,
      created_at: league.created_at,
      owner_email: profileMap.get(league.owner_id) || "Unknown",
      member_count: memberCounts.get(league.id) || 0,
    }));

    setLeagues(leaguesWithDetails);
    setLoading(false);
  };

  const handleDeleteLeague = async (leagueId: string, leagueName: string) => {
    setDeletingId(leagueId);
    
    const { error } = await supabase
      .from("leagues")
      .delete()
      .eq("id", leagueId);

    if (error) {
      console.error("Error deleting league:", error);
      toast({
        title: "Error",
        description: `Failed to delete league: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "League Deleted",
        description: `"${leagueName}" has been permanently deleted.`,
      });
      setLeagues((prev) => prev.filter((l) => l.id !== leagueId));
    }
    
    setDeletingId(null);
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/leagues")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Platform Admin</h1>
          </div>
        </div>

        <Tabs defaultValue="leagues" className="space-y-6">
          <TabsList>
            <TabsTrigger value="leagues" className="gap-2">
              <Users className="h-4 w-4" />
              Leagues
            </TabsTrigger>
            <TabsTrigger value="cast" className="gap-2">
              <UserCircle className="h-4 w-4" />
              Cast
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-2">
              <Newspaper className="h-4 w-4" />
              News
            </TabsTrigger>
            <TabsTrigger value="bugs" className="gap-2">
              <Bug className="h-4 w-4" />
              Bugs ({bugs.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leagues">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Leagues ({leagues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leagues.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No leagues created yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Owner Email</TableHead>
                        <TableHead className="text-center">Members</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leagues.map((league) => (
                        <TableRow key={league.id}>
                          <TableCell className="font-medium">{league.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {league.owner_email}
                          </TableCell>
                          <TableCell className="text-center">{league.member_count}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(league.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/league/${league.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    disabled={deletingId === league.id}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete League</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{league.name}"? This will permanently remove the league, all memberships, game sessions, and associated data. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteLeague(league.id, league.name)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete League
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cast">
            <CastManager />
          </TabsContent>

          <TabsContent value="news">
            <NewsManager />
          </TabsContent>

          <TabsContent value="bugs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Bug Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bugs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No bug reports yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bugs.map((bug) => (
                        <TableRow key={bug.id}>
                          <TableCell className="text-muted-foreground text-xs">{bug.user_email}</TableCell>
                          <TableCell className="max-w-xs truncate">{bug.description}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{bug.page_url}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{format(new Date(bug.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <select
                              value={bug.status}
                              onChange={(e) => handleUpdateBugStatus(bug.id, e.target.value)}
                              className="text-xs rounded border border-input bg-background px-2 py-1"
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}