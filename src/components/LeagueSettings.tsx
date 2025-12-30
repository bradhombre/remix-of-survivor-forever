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
import { Copy, Save, Users, Link2, Pencil, Trash2, ShieldPlus, Scale, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { SCORING_ACTIONS } from "@/types/survivor";
import { QRCodeSVG } from "qrcode.react";

interface LeagueSettingsProps {
  leagueId: string;
}

interface LeagueData {
  name: string;
  invite_code: string;
  owner_id: string;
  scoring_config: Record<string, number> | null;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email: string;
}

type ScoringConfig = Record<string, number>;

// Build default config from SCORING_ACTIONS
const getDefaultScoringConfig = (): ScoringConfig => {
  const config: ScoringConfig = {};
  Object.entries(SCORING_ACTIONS).forEach(([key, value]) => {
    config[key] = value.points;
  });
  return config;
};

export function LeagueSettings({ leagueId }: LeagueSettingsProps) {
  const navigate = useNavigate();
  const [league, setLeague] = useState<LeagueData | null>(null);
  const [leagueName, setLeagueName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>(getDefaultScoringConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingScoring, setSavingScoring] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Fetch league details including scoring_config
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("name, invite_code, owner_id, scoring_config")
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
        scoring_config: leagueData.scoring_config as Record<string, number> | null,
      });
      setLeagueName(leagueData.name);
      
      // Load scoring config from DB or use defaults
      if (leagueData.scoring_config) {
        const savedConfig = leagueData.scoring_config as Record<string, number>;
        const mergedConfig = { ...getDefaultScoringConfig(), ...savedConfig };
        setScoringConfig(mergedConfig);
      }

      // Fetch members with their profile emails
      const { data: memberships, error: membersError } = await supabase
        .from("league_memberships")
        .select("id, role, joined_at, user_id")
        .eq("league_id", leagueId);

      if (membersError) {
        toast.error("Failed to load members");
        setLoading(false);
        return;
      }

      // Fetch profiles for all members
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

  const handleSaveScoringConfig = async () => {
    setSavingScoring(true);
    const { error } = await supabase
      .from("leagues")
      .update({ scoring_config: scoringConfig })
      .eq("id", leagueId);

    if (error) {
      toast.error("Failed to save scoring rules");
    } else {
      toast.success("Scoring rules saved");
    }
    setSavingScoring(false);
  };

  const handleScoringChange = (key: string, value: number) => {
    setScoringConfig(prev => ({ ...prev, [key]: value }));
  };

  const hasUnsavedScoringChanges = () => {
    const savedConfig = league?.scoring_config || {};
    const defaults = getDefaultScoringConfig();
    
    return Object.keys(SCORING_ACTIONS).some(key => {
      const currentValue = scoringConfig[key];
      const savedValue = (savedConfig as Record<string, number>)[key] ?? defaults[key];
      return currentValue !== savedValue;
    });
  };

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
    // Can't manage yourself
    if (member.user_id === currentUserId) return false;
    // Can't manage other league_admins or super_admins
    if (member.role === "league_admin" || member.role === "super_admin") return false;
    return true;
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
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
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
                  size={128}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Scoring Rules Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Scoring Rules
          </CardTitle>
          <CardDescription>
            Customize point values for each scoring action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3">
              {Object.entries(SCORING_ACTIONS).map(([key, action]) => (
                <div 
                  key={key} 
                  className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{action.emoji}</span>
                    <span className="text-sm font-medium">{action.label.replace(` ${action.emoji}`, '')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={scoringConfig[key] ?? action.points}
                      onChange={(e) => handleScoringChange(key, parseInt(e.target.value) || 0)}
                      className="w-24 text-right"
                      disabled={!isOwner}
                    />
                    <span className="text-sm text-muted-foreground w-8">pts</span>
                  </div>
                </div>
              ))}
            </div>
            {isOwner && (
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveScoringConfig} 
                  disabled={savingScoring || !hasUnsavedScoringChanges()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingScoring ? "Saving..." : "Save Scoring Rules"}
                </Button>
              </div>
            )}
            {!isOwner && (
              <p className="text-sm text-muted-foreground">
                Only the league owner can edit scoring rules.
              </p>
            )}
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
