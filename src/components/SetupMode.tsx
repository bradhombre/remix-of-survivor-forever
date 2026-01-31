import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Shuffle, Upload, Download, Trash2, Play, List, GripVertical, Pencil, Check, X, Plus, Minus, Users, Copy } from "lucide-react";
import { Player, Contestant, DraftType } from "@/types/survivor";
import { useToast } from "@/hooks/use-toast";
import { useLeagueTeams } from "@/hooks/useLeagueTeams";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface SetupModeProps {
  leagueId: string;
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
}

export const SetupMode = ({
  leagueId,
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
}: SetupModeProps) => {
  const [name, setName] = useState("");
  const [tribe, setTribe] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTribe, setEditTribe] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const { toast } = useToast();

  // Team management state
  const { teams, loading: teamsLoading, resizeLeague, renameTeam, getFilledCount } = useLeagueTeams({ leagueId });
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const teamByName = useMemo(() => {
    const map = new Map<string, (typeof teams)[number]>();
    teams.forEach((t) => map.set(t.name, t));
    return map;
  }, [teams]);

  // Fetch invite code
  useState(() => {
    const fetchInviteCode = async () => {
      const { data } = await supabase
        .from('leagues')
        .select('invite_code')
        .eq('id', leagueId)
        .maybeSingle();
      if (data) setInviteCode(data.invite_code);
    };
    fetchInviteCode();
  });

  const filledCount = getFilledCount();
  const leagueSize = teams.length;

  const handleResizeLeague = async (delta: number) => {
    const newSize = leagueSize + delta;
    if (newSize < 2 || newSize > 20) return;
    if (newSize < filledCount) {
      toast({ 
        title: "Cannot shrink league", 
        description: `${filledCount} slots are already filled.`, 
        variant: "destructive" 
      });
      return;
    }

    setIsResizing(true);
    try {
      await resizeLeague(newSize);
      toast({ title: `League size updated to ${newSize}` });
    } catch (err: any) {
      toast({ title: "Failed to resize league", description: err.message, variant: "destructive" });
    } finally {
      setIsResizing(false);
    }
  };

  // Keep draft order aligned with team slots when league size changes (preserve any manual reordering)
  useEffect(() => {
    if (teams.length === 0) return;

    const teamNames = teams.map((t) => t.name);
    const current = draftOrder as string[];

    const hasMismatch =
      current.length !== teamNames.length ||
      current.some((name) => !teamNames.includes(name)) ||
      teamNames.some((name) => !current.includes(name));

    if (!hasMismatch) return;

    const merged = current.filter((name) => teamNames.includes(name));
    teamNames.forEach((name) => {
      if (!merged.includes(name)) merged.push(name);
    });

    onSetDraftOrder(merged as Player[]);
  }, [teams, draftOrder, onSetDraftOrder]);

  const handleRenameTeam = async (teamId: string, oldName: string) => {
    const trimmedName = editTeamName.trim();
    if (!trimmedName || trimmedName === oldName) {
      setEditingTeamId(null);
      return;
    }

    if (trimmedName.length < 2) {
      toast({ title: "Team name must be at least 2 characters", variant: "destructive" });
      return;
    }

    if (teams.some(t => t.id !== teamId && t.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Team name already exists", variant: "destructive" });
      return;
    }

    try {
      await renameTeam(teamId, trimmedName);
      // Update draft order
      onSetDraftOrder(draftOrder.map(p => p === oldName ? trimmedName : p));
      setEditingTeamId(null);
      toast({ title: "Team renamed!", description: `Renamed to ${trimmedName}.` });
    } catch (err) {
      toast({ title: "Failed to rename team", variant: "destructive" });
    }
  };

  const copyInviteLink = () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Invite link copied!" });
  };

  const handleAddContestant = () => {
    if (!name.trim()) return;
    onAddContestant(
      name.trim(), 
      tribe.trim() || undefined,
      age ? Number(age) : undefined,
      location.trim() || undefined
    );
    setName("");
    setTribe("");
    setAge("");
    setLocation("");
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').filter(line => line.trim());
    let addedCount = 0;

    lines.forEach((line) => {
      const parts = line.split(',').map(p => p.trim());
      const contestantName = parts[0];
      const contestantAge = parts[1] ? Number(parts[1]) : undefined;
      const contestantLocation = parts[2] || undefined;
      const contestantTribe = parts[3] || undefined;

      if (contestantName) {
        onAddContestant(contestantName, contestantTribe, contestantAge, contestantLocation);
        addedCount++;
      }
    });

    setBulkText("");
    setShowBulkImport(false);
    toast({
      title: `${addedCount} Contestants Added! ✅`,
      description: "Bulk import successful.",
    });
  };

  const handleCSVFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvData = event.target?.result as string;
        const lines = csvData.split('\n').filter(line => line.trim());
        
        const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
        let addedCount = 0;

        for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          const contestantName = parts[0];
          const contestantAge = parts[1] ? Number(parts[1]) : undefined;
          const contestantLocation = parts[2] || undefined;
          const contestantTribe = parts[3] || undefined;

          if (contestantName) {
            onAddContestant(contestantName, contestantTribe, contestantAge, contestantLocation);
            addedCount++;
          }
        }

        toast({
          title: `${addedCount} Contestants Imported! ✅`,
          description: "CSV import successful.",
        });
      } catch (error) {
        toast({
          title: "Import Failed ❌",
          description: "Invalid CSV format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result as string;
        onImport(data);
        toast({
          title: "Import Successful ✅",
          description: "Season data loaded.",
        });
      } catch (error) {
        toast({
          title: "Import Failed ❌",
          description: "Invalid file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const canStartDraft = contestants.length >= 16 && !contestants.some((c) => c.owner);

  // Editing contestant handlers
  const startEditing = (contestant: Contestant) => {
    setEditingId(contestant.id);
    setEditName(contestant.name);
    setEditTribe(contestant.tribe || "");
    setEditAge(contestant.age?.toString() || "");
    setEditLocation(contestant.location || "");
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateContestant(id, {
      name: editName.trim(),
      tribe: editTribe.trim() || undefined,
      age: editAge ? Number(editAge) : undefined,
      location: editLocation.trim() || undefined,
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
          🔥 Survivor Fantasy League
        </h1>
        <p className="text-muted-foreground text-lg">Setup your season and draft</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Season & Quick Actions */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">⚙️ Season Setup</h2>
          
          <div>
            <Label htmlFor="season">Season Number</Label>
            <Input
              id="season"
              type="number"
              value={season}
              onChange={(e) => onSeasonChange(Number(e.target.value))}
              className="glass mt-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button onClick={onExport} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <label htmlFor="import-file" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                  <input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>
          </div>
        </Card>

        {/* League Size & Members */}
        <Card className="glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">👥 League Size</h2>
            <span className="text-sm text-muted-foreground">
              {filledCount}/{leagueSize} filled
            </span>
          </div>

          {teamsLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              {/* Size controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={() => handleResizeLeague(-1)}
                  variant="outline"
                  size="icon"
                  disabled={isResizing || leagueSize <= 2 || leagueSize <= filledCount}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-4xl font-bold text-primary min-w-[60px] text-center">
                  {leagueSize}
                </span>
                <Button
                  onClick={() => handleResizeLeague(1)}
                  variant="outline"
                  size="icon"
                  disabled={isResizing || leagueSize >= 20}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Team slots */}
              <div className="space-y-2">
                {teams.map((team) => {
                  const isEditing = editingTeamId === team.id;
                  const isFilled = !!team.user_id;

                  return (
                    <div key={team.id} className="glass p-3 rounded-lg flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={team.avatar_url || undefined} alt={team.name} />
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {team.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-accent w-6">{team.position}.</span>
                      
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editTeamName}
                            onChange={(e) => setEditTeamName(e.target.value)}
                            className="h-8 flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameTeam(team.id, team.name);
                              if (e.key === "Escape") setEditingTeamId(null);
                            }}
                          />
                          <Button onClick={() => handleRenameTeam(team.id, team.name)} size="sm" variant="default">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => setEditingTeamId(null)} size="sm" variant="ghost">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <span className="font-medium">{team.name}</span>
                            {isFilled ? (
                              <span className="text-xs text-muted-foreground ml-2">
                                — {team.user_email || 'Assigned'}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/60 ml-2 italic">
                                (unassigned)
                              </span>
                            )}
                          </div>
                          {!isFilled && (
                            <Button
                              onClick={() => {
                                setEditingTeamId(team.id);
                                setEditTeamName(team.name);
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Invite code */}
              {inviteCode && (
                <div className="pt-2 border-t border-border">
                  <Label className="text-xs text-muted-foreground">Invite Code</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-muted px-3 py-2 rounded-md font-mono text-lg tracking-widest flex-1 text-center">
                      {inviteCode}
                    </code>
                    <Button onClick={copyInviteLink} variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this code. Users are auto-assigned to the next open slot when they join.
                  </p>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Draft Settings */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">🎲 Draft Settings</h2>

          <div>
            <Label>Draft Order (drag to reorder)</Label>
            <div className="space-y-2 mt-2">
              {draftOrder.map((player, index) => {
                const team = teamByName.get(String(player));
                const isFilled = !!team?.user_id;

                return (
                  <div key={`${String(player)}-${index}`} className="glass p-3 rounded-lg flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <span className="font-bold text-accent">{index + 1}</span>

                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{String(player)}</span>
                      {team?.user_email && (
                        <span className="text-xs text-muted-foreground ml-2">({team.user_email})</span>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {index > 0 && (
                        <Button
                          onClick={() => {
                            const newOrder = [...draftOrder];
                            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                            onSetDraftOrder(newOrder);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          ↑
                        </Button>
                      )}
                      {index < draftOrder.length - 1 && (
                        <Button
                          onClick={() => {
                            const newOrder = [...draftOrder];
                            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                            onSetDraftOrder(newOrder);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          ↓
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button onClick={onRandomizeDraftOrder} variant="outline" className="w-full">
              <Shuffle className="mr-2 h-4 w-4" />
              Randomize Order
            </Button>
          </div>

          <div>
            <Label>Draft Type</Label>
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() => onDraftTypeChange("snake")}
                variant={draftType === "snake" ? "default" : "outline"}
                className="flex-1"
              >
                🐍 Snake
              </Button>
              <Button
                onClick={() => onDraftTypeChange("linear")}
                variant={draftType === "linear" ? "default" : "outline"}
                className="flex-1"
              >
                📏 Linear
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Contestants */}
      <Card className="glass p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">🏝️ Add Contestants</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowBulkImport(!showBulkImport)}
              variant="outline"
              size="sm"
            >
              <List className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label htmlFor="csv-import" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                CSV Import
                <input
                  id="csv-import"
                  type="file"
                  accept=".csv"
                  onChange={handleCSVFileImport}
                  className="hidden"
                />
              </label>
            </Button>
          </div>
        </div>

        {showBulkImport ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste contestant data (one per line). Format: Name, Age, Location, Tribe
            </p>
            <Textarea
              placeholder="John Doe, 32, California, Ulong&#10;Jane Smith, 28, Texas, Koror"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="glass min-h-[120px]"
            />
            <div className="flex gap-2">
              <Button onClick={handleBulkImport} className="flex-1">
                Import All
              </Button>
              <Button onClick={() => setShowBulkImport(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddContestant()}
                className="glass mt-2"
              />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddContestant()}
                className="glass mt-2"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="City, State"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddContestant()}
                className="glass mt-2"
              />
            </div>
            <div>
              <Label htmlFor="tribe">Tribe</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tribe"
                  placeholder="Tribe name"
                  value={tribe}
                  onChange={(e) => setTribe(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddContestant()}
                  className="glass flex-1"
                />
                <Button onClick={handleAddContestant} disabled={!name.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Contestants List */}
      {contestants.length > 0 && (
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            📋 Contestants ({contestants.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {contestants.map((contestant) => (
              <div
                key={contestant.id}
                className="glass p-3 rounded-lg flex items-center gap-3"
              >
                {editingId === contestant.id ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                      className="h-8"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Input
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        placeholder="Age"
                        type="number"
                        className="h-8 w-16"
                      />
                      <Input
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Location"
                        className="h-8 flex-1"
                      />
                      <Input
                        value={editTribe}
                        onChange={(e) => setEditTribe(e.target.value)}
                        placeholder="Tribe"
                        className="h-8 flex-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveEdit(contestant.id)} size="sm" className="flex-1">
                        <Check className="h-4 w-4 mr-1" /> Save
                      </Button>
                      <Button onClick={cancelEdit} size="sm" variant="outline" className="flex-1">
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium">{contestant.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[
                          contestant.age && `${contestant.age}`,
                          contestant.location,
                          contestant.tribe,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => startEditing(contestant)}
                        size="sm"
                        variant="ghost"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => onDeleteContestant(contestant.id)}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Start Draft */}
      <Card className="glass p-6">
        <Button
          onClick={onStartDraft}
          disabled={!canStartDraft}
          className="w-full py-6 text-xl font-bold"
          size="lg"
        >
          <Play className="mr-2 h-6 w-6" />
          Start Draft ({contestants.length}/16 contestants)
        </Button>
        {!canStartDraft && (
          <p className="text-center text-muted-foreground mt-2">
            Need at least 16 contestants to start the draft
          </p>
        )}
      </Card>
    </div>
  );
};
