import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { Users, Gamepad2, MessageSquare, Trophy, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeagueDetailSheetProps {
  leagueId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeagueDetail {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  owner_email: string;
  owner_id: string;
  last_activity_at: string | null;
  session?: {
    mode: string;
    season: number;
    episode: number;
    draft_type: string;
    game_type: string;
  };
  members: { user_id: string; email: string; display_name: string | null; role: string; team_name: string | null }[];
  contestants: { name: string; owner: string | null; is_eliminated: boolean }[];
  recentMessages: { content: string; user_email: string; created_at: string; is_bot: boolean }[];
  scoringEventsCount: number;
}

export function LeagueDetailSheet({ leagueId, open, onOpenChange }: LeagueDetailSheetProps) {
  const [detail, setDetail] = useState<LeagueDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!leagueId || !open) return;
    fetchDetail(leagueId);
  }, [leagueId, open]);

  const fetchDetail = async (id: string) => {
    setLoading(true);
    try {
      // Fetch league
      const { data: league } = await supabase
        .from("leagues")
        .select("id, name, invite_code, created_at, owner_id, last_activity_at")
        .eq("id", id)
        .single();
      if (!league) return;

      // Fetch owner email
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", league.owner_id)
        .single();

      // Fetch game session
      const { data: sessions } = await supabase
        .from("game_sessions")
        .select("mode, season, episode, draft_type, game_type, id")
        .eq("league_id", id)
        .order("created_at", { ascending: false })
        .limit(1);
      const session = sessions?.[0];

      // Fetch memberships
      const { data: memberships } = await supabase
        .from("league_memberships")
        .select("user_id, role")
        .eq("league_id", id);

      // Fetch teams
      const { data: teams } = await supabase
        .from("league_teams")
        .select("user_id, name")
        .eq("league_id", id);

      // Fetch profiles for members
      const userIds = memberships?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const teamMap = new Map(teams?.filter(t => t.user_id).map(t => [t.user_id, t.name]) || []);

      const members = (memberships || []).map(m => {
        const prof = profileMap.get(m.user_id);
        return {
          user_id: m.user_id,
          email: prof?.email || "Unknown",
          display_name: prof?.display_name || null,
          role: m.role,
          team_name: teamMap.get(m.user_id) || null,
        };
      });

      // Fetch contestants
      let contestants: LeagueDetail["contestants"] = [];
      if (session) {
        const { data: contestantsData } = await supabase
          .from("contestants")
          .select("name, owner, is_eliminated")
          .eq("session_id", session.id)
          .order("pick_number", { ascending: true });
        contestants = contestantsData || [];
      }

      // Fetch recent chat messages
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("content, user_id, created_at, is_bot")
        .eq("league_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      const msgUserIds = [...new Set(messages?.map(m => m.user_id) || [])];
      const { data: msgProfiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", msgUserIds);
      const msgProfileMap = new Map(msgProfiles?.map(p => [p.id, p.email]) || []);

      const recentMessages = (messages || []).reverse().map(m => ({
        content: m.content,
        user_email: m.is_bot ? "JeffBot" : (msgProfileMap.get(m.user_id) || "Unknown"),
        created_at: m.created_at,
        is_bot: m.is_bot,
      }));

      // Scoring events count
      let scoringEventsCount = 0;
      if (session) {
        const { count } = await supabase
          .from("scoring_events")
          .select("id", { count: "exact", head: true })
          .eq("session_id", session.id);
        scoringEventsCount = count || 0;
      }

      setDetail({
        id: league.id,
        name: league.name,
        invite_code: league.invite_code,
        created_at: league.created_at || "",
        owner_email: ownerProfile?.email || "Unknown",
        owner_id: league.owner_id,
        last_activity_at: league.last_activity_at,
        session: session ? {
          mode: session.mode,
          season: session.season,
          episode: session.episode,
          draft_type: session.draft_type,
          game_type: session.game_type,
        } : undefined,
        members,
        contestants,
        recentMessages,
        scoringEventsCount,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (detail) {
      navigator.clipboard.writeText(detail.invite_code);
      toast({ title: "Invite code copied!" });
    }
  };

  const pickedCount = detail?.contestants.filter(c => c.owner).length || 0;
  const totalCount = detail?.contestants.length || 0;
  const eliminatedCount = detail?.contestants.filter(c => c.is_eliminated).length || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{detail?.name || "League Details"}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : detail ? (
          <ScrollArea className="h-[calc(100vh-5rem)] pr-4">
            <div className="space-y-6 pb-8">
              {/* Overview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Owner</span>
                  <span className="text-sm">{detail.owner_email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Invite Code</span>
                  <button onClick={copyInviteCode} className="flex items-center gap-1 text-sm font-mono hover:text-primary transition-colors">
                    {detail.invite_code} <Copy className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{detail.created_at ? format(new Date(detail.created_at), "MMM d, yyyy") : "—"}</span>
                </div>
                {detail.last_activity_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Activity</span>
                    <span className="text-sm">{formatDistanceToNow(new Date(detail.last_activity_at), { addSuffix: true })}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Game State */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" /> Game State
                </h4>
                {detail.session ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Mode:</span>{" "}
                      <Badge variant="outline" className="capitalize">{detail.session.mode}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Season:</span> {detail.session.season}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Episode:</span> {detail.session.episode}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Draft:</span> {detail.session.draft_type}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span> {detail.session.game_type}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No game session</p>
                )}
              </div>

              <Separator />

              {/* Members */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" /> Members ({detail.members.length})
                </h4>
                <div className="space-y-1">
                  {detail.members.map(m => (
                    <div key={m.user_id} className="flex items-center justify-between text-sm py-1">
                      <div>
                        <span>{m.display_name || m.email}</span>
                        {m.team_name && <span className="text-muted-foreground ml-2">({m.team_name})</span>}
                      </div>
                      <Badge variant={m.role === "league_admin" || m.role === "super_admin" ? "default" : "secondary"} className="text-xs">
                        {m.role.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Draft Status */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4" /> Contestants ({pickedCount}/{totalCount} drafted, {eliminatedCount} eliminated)
                </h4>
                {detail.contestants.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1">
                    {detail.contestants.map(c => (
                      <div key={c.name} className={`text-xs py-1 px-2 rounded ${c.is_eliminated ? "line-through text-muted-foreground" : ""}`}>
                        {c.name}
                        {c.owner && <span className="text-muted-foreground ml-1">→ {c.owner}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No contestants loaded</p>
                )}
              </div>

              <Separator />

              {/* Recent Chat */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Recent Chat ({detail.recentMessages.length})
                </h4>
                {detail.recentMessages.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {detail.recentMessages.map((msg, i) => (
                      <div key={i} className="text-xs">
                        <span className={`font-medium ${msg.is_bot ? "text-primary" : ""}`}>{msg.user_email}:</span>{" "}
                        <span className="text-muted-foreground">{msg.content.slice(0, 120)}{msg.content.length > 120 ? "..." : ""}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No messages</p>
                )}
              </div>

              <Separator />

              {/* Scoring */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total Scoring Events</span>
                <Badge variant="outline">{detail.scoringEventsCount}</Badge>
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
