import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy, Save, Users, Link2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface LeagueSettingsProps {
  leagueId: string;
}

interface LeagueData {
  name: string;
  invite_code: string;
  owner_id: string;
}

interface Member {
  id: string;
  role: string;
  joined_at: string;
  email: string;
}

export function LeagueSettings({ leagueId }: LeagueSettingsProps) {
  const [league, setLeague] = useState<LeagueData | null>(null);
  const [leagueName, setLeagueName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Fetch league details
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("name, invite_code, owner_id")
        .eq("id", leagueId)
        .single();

      if (leagueError) {
        toast.error("Failed to load league settings");
        return;
      }

      setLeague(leagueData);
      setLeagueName(leagueData.name);

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
        <CardContent>
          <div className="flex gap-3 items-center">
            <Input
              value={league?.invite_code || ""}
              readOnly
              className="max-w-[200px] font-mono text-lg tracking-widest"
            />
            <Button variant="outline" onClick={handleCopyInviteCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(member.joined_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
