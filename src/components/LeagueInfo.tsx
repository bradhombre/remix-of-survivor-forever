import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Copy, Save, Users, Link2, Pencil, Trash2, ShieldPlus, ExternalLink, LogOut, UserCircle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { useLeagueTeams } from "@/hooks/useLeagueTeams";
import { TeamAvatarUpload } from "./TeamAvatarUpload";

interface LeagueInfoProps {
  leagueId: string;
}

interface LeagueData {
  name: string;
  invite_code: string;
  owner_id: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email: string;
}

export function LeagueInfo({ leagueId }: LeagueInfoProps) {
  const navigate = useNavigate();
  const [league, setLeague] = useState<LeagueData | null>(null);
  const [leagueName, setLeagueName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  // My Team state
  const { teams, getMyTeam, updateTeam } = useLeagueTeams({ leagueId });
  const myTeam = getMyTeam(currentUserId);
  const [editingMyTeam, setEditingMyTeam] = useState(false);
  const [myTeamName, setMyTeamName] = useState("");
  const [savingMyTeam, setSavingMyTeam] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("name, invite_code, owner_id")
        .eq("id", leagueId)
        .single();

      if (leagueError) {
        toast.error("Failed to load league settings");
        return;
      }

      setLeague({
        name: leagueData.name,
        invite_code: leagueData.invite_code,
        owner_id: leagueData.owner_id,
      });
      setLeagueName(leagueData.name);

      const { data: memberships, error: membersError } = await supabase
        .from("league_memberships")
        .select("id, role, joined_at, user_id")
        .eq("league_id", leagueId);

      if (membersError) {
        toast.error("Failed to load members");
        setLoading(false);
        return;
      }

      if (memberships && memberships.length > 0) {
        const userIds = memberships.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        const membersWithEmail = memberships.map(m => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at || "",
          email: profiles?.find(p => p.id === m.user_id)?.email || "Unknown",
        }));

        setMembers(membersWithEmail);
      }

      setLoading(false);
    };

    fetchData();
  }, [leagueId]);

  // Sync myTeamName when myTeam changes
  useEffect(() => {
    if (myTeam && !editingMyTeam) {
      setMyTeamName(myTeam.name);
    }
  }, [myTeam, editingMyTeam]);

  const handleSaveMyTeamName = async () => {
    if (!myTeam || !myTeamName.trim()) return;
    
    setSavingMyTeam(true);
    try {
      await updateTeam(myTeam.id, { name: myTeamName.trim() });
      toast.success("Team name updated!");
      setEditingMyTeam(false);
    } catch (err) {
      toast.error("Failed to update team name");
    }
    setSavingMyTeam(false);
  };


  const handleSaveName = async () => {
    if (!leagueName.trim()) {
      toast.error("League name cannot be empty");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("leagues")
      .update({ name: leagueName.trim() })
      .eq("id", leagueId);

    if (error) {
      toast.error("Failed to update league name");
    } else {
      toast.success("League name updated");
      setLeague(prev => prev ? { ...prev, name: leagueName.trim() } : null);
    }
    setSaving(false);
  };

  const handleCopyInviteCode = () => {
    if (league?.invite_code) {
      navigator.clipboard.writeText(league.invite_code);
      toast.success("Invite code copied to clipboard");
    }
  };

  const handleCopyInviteLink = () => {
    if (league?.invite_code) {
      const link = `${window.location.origin}/join/${league.invite_code}`;
      navigator.clipboard.writeText(link);
      toast.success("Invite link copied to clipboard");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "league_admin":
        return "default";
      case "super_admin":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const isOwner = currentUserId === league?.owner_id;

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    const { error } = await supabase
      .from("league_memberships")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to remove member");
    } else {
      toast.success(`${memberEmail} removed from league`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    }
  };

  const handlePromoteToAdmin = async (memberId: string, memberEmail: string) => {
    const { error } = await supabase
      .from("league_memberships")
      .update({ role: "league_admin" })
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to promote member");
    } else {
      toast.success(`${memberEmail} promoted to admin`);
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: "league_admin" } : m
      ));
    }
  };

  const canManageMember = (member: Member) => {
    if (member.user_id === currentUserId) return false;
    if (member.role === "league_admin" || member.role === "super_admin") return false;
    return isOwner;
  };

  const handleLeaveLeague = async () => {
    if (!currentUserId) return;
    
    setIsLeaving(true);
    const { error } = await supabase
      .from("league_memberships")
      .delete()
      .eq("league_id", leagueId)
      .eq("user_id", currentUserId);

    if (error) {
      toast.error("Failed to leave league");
      setIsLeaving(false);
    } else {
      toast.success("You have left the league");
      navigate("/leagues");
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      {/* My Team Section */}
      {myTeam && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              My Team
            </CardTitle>
            <CardDescription>
              Customize your team name and photo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <TeamAvatarUpload
                teamId={myTeam.id}
                leagueId={leagueId}
                currentAvatarUrl={myTeam.avatar_url}
                teamName={myTeam.name}
                onUploadComplete={() => {}}
                size="lg"
              />

              {/* Team info */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">Position #{myTeam.position}</Badge>
                </div>
                
                {editingMyTeam ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={myTeamName}
                      onChange={(e) => setMyTeamName(e.target.value)}
                      placeholder="Enter team name"
                      className="flex-1"
                      maxLength={50}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveMyTeamName();
                        if (e.key === "Escape") {
                          setEditingMyTeam(false);
                          setMyTeamName(myTeam.name);
                        }
                      }}
                      autoFocus
                    />
                    <Button onClick={handleSaveMyTeamName} size="icon" disabled={savingMyTeam || !myTeamName.trim()}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => { setEditingMyTeam(false); setMyTeamName(myTeam.name); }} size="icon" variant="ghost">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{myTeam.name}</h3>
                    <Button onClick={() => setEditingMyTeam(true)} size="icon" variant="ghost">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* League Name Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            League Name
          </CardTitle>
          <CardDescription>
            {isOwner ? "Edit your league's display name" : "View the league name"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="Enter league name"
              disabled={!isOwner}
              className="max-w-md"
            />
            {isOwner && (
              <Button onClick={handleSaveName} disabled={saving || leagueName === league?.name}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
          {!isOwner && (
            <p className="text-sm text-muted-foreground mt-2">
              Only the league owner can edit the name.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invite Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Invite Code
          </CardTitle>
          <CardDescription>
            Share this code with others to let them join your league
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <Input
              value={league?.invite_code || ""}
              readOnly
              className="max-w-[200px] font-mono text-lg tracking-widest"
            />
            <Button variant="outline" onClick={handleCopyInviteCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
            <Button variant="outline" onClick={handleCopyInviteLink}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
          
          {league?.invite_code && (
            <div className="flex flex-col items-center sm:items-start gap-2 pt-2">
              <p className="text-sm text-muted-foreground">Scan to join:</p>
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG 
                  value={`${window.location.origin}/join/${league.invite_code}`}
                  size={160}
                  level="M"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in this league
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isOwner && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.email}
                    {member.user_id === currentUserId && (
                      <span className="text-muted-foreground ml-2">(you)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(member.joined_at)}
                  </TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      {canManageMember(member) ? (
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePromoteToAdmin(member.id, member.email)}
                          >
                            <ShieldPlus className="h-4 w-4 mr-1" />
                            Promote
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.email} from this league? 
                                  They will need to rejoin using the invite code.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.id, member.email)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Leave League Section - Only for non-owners */}
      {!isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <LogOut className="h-5 w-5" />
              Leave League
            </CardTitle>
            <CardDescription>
              Leave this league and remove yourself from all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLeaving}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {isLeaving ? "Leaving..." : "Leave League"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave League</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to leave "{league?.name}"? You will need a new invite code to rejoin.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveLeague}>
                    Leave
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
