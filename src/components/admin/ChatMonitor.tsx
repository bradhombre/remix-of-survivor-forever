import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Bot, Users, TrendingUp, Loader2 } from "lucide-react";
import { format, isToday } from "date-fns";

interface ChatMsg {
  id: string;
  content: string;
  created_at: string;
  is_bot: boolean;
  user_id: string;
  league_id: string;
  league_name?: string;
  sender_name?: string;
}

interface Stats {
  total: number;
  today: number;
  botMessages: number;
  activeLeagues: number;
}

const PAGE_SIZE = 50;

export function ChatMonitor() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, botMessages: 0, activeLeagues: 0 });
  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([]);
  const [filterLeague, setFilterLeague] = useState<string>("all");
  const [hideBot, setHideBot] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchStats = useCallback(async () => {
    // Total messages
    const { count: total } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true });

    // Today's messages
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: today } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    // Bot messages
    const { count: botMessages } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_bot", true);

    // Active leagues (distinct league_ids)
    const { data: leagueData } = await supabase
      .from("chat_messages")
      .select("league_id");
    const uniqueLeagues = new Set(leagueData?.map((m) => m.league_id) || []);

    setStats({
      total: total || 0,
      today: today || 0,
      botMessages: botMessages || 0,
      activeLeagues: uniqueLeagues.size,
    });
  }, []);

  const fetchMessages = useCallback(async (offset: number, leagueFilter: string) => {
    let query = supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (leagueFilter !== "all") {
      query = query.eq("league_id", leagueFilter);
    }

    if (hideBot) {
      query = query.eq("is_bot", false);
    }

    const { data } = await query;
    if (!data) return [];

    // Fetch league names and sender info
    const leagueIds = [...new Set(data.map((m) => m.league_id))];
    const userIds = [...new Set(data.filter((m) => !m.is_bot).map((m) => m.user_id))];

    const [leaguesRes, profilesRes, teamsRes] = await Promise.all([
      leagueIds.length > 0
        ? supabase.from("leagues").select("id, name").in("id", leagueIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase.from("profiles").select("id, email, display_name").in("id", userIds)
        : Promise.resolve({ data: [] }),
      leagueIds.length > 0
        ? supabase.from("league_teams").select("league_id, user_id, name").in("league_id", leagueIds)
        : Promise.resolve({ data: [] }),
    ]);

    const leagueMap = new Map((leaguesRes.data || []).map((l: any) => [l.id, l.name]));
    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.display_name || p.email]));
    // Build user+league -> team name map
    const teamMap = new Map<string, string>();
    (teamsRes.data || []).forEach((t: any) => {
      if (t.user_id) teamMap.set(`${t.user_id}:${t.league_id}`, t.name);
    });

    const enriched: ChatMsg[] = data.map((m: any) => ({
      ...m,
      league_name: leagueMap.get(m.league_id) || "Unknown League",
      sender_name: m.is_bot
        ? "JeffBot"
        : teamMap.get(`${m.user_id}:${m.league_id}`) || profileMap.get(m.user_id) || "Unknown",
    }));

    return enriched;
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    const [msgs] = await Promise.all([fetchMessages(0, filterLeague), fetchStats()]);
    setMessages(msgs);
    setHasMore(msgs.length === PAGE_SIZE);
    setLoading(false);
  }, [filterLeague, fetchMessages, fetchStats]);

  useEffect(() => {
    // Fetch leagues for filter
    supabase.from("leagues").select("id, name").order("name").then(({ data }) => {
      setLeagues(data || []);
    });
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const more = await fetchMessages(messages.length, filterLeague);
    setMessages((prev) => [...prev, ...more]);
    setHasMore(more.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Messages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.today}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Bot className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.botMessages.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">JeffBot Messages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.activeLeagues}</p>
              <p className="text-xs text-muted-foreground">Active Leagues</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Messages */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat Feed
            </CardTitle>
            <Select value={filterLeague} onValueChange={setFilterLeague}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Leagues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leagues</SelectItem>
                {leagues.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No messages found.</p>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2 pr-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {msg.league_name}
                        </Badge>
                        <span className="font-medium truncate">
                          {msg.sender_name}
                        </span>
                        {msg.is_bot && (
                          <Bot className="h-3 w-3 text-primary shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          {isToday(new Date(msg.created_at))
                            ? format(new Date(msg.created_at), "h:mm a")
                            : format(new Date(msg.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-muted-foreground break-words line-clamp-2">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center pt-4 pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
