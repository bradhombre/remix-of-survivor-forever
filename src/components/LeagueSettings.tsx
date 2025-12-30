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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Save, Users, Link2, Pencil, Trash2, ShieldPlus, Scale, ExternalLink, LogOut, ChevronDown, RotateCcw, Plus, Bookmark, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { SCORING_ACTIONS } from "@/types/survivor";
import { QRCodeSVG } from "qrcode.react";
import { Switch } from "@/components/ui/switch";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { 
  CustomScoringAction, 
  getCustomActions, 
  addCustomAction, 
  removeCustomAction, 
  updateCustomAction,
  SCORING_TEMPLATES,
  applyTemplate,
  ScoringTemplate,
} from "@/lib/scoring";

// Group scoring actions by category
const SCORING_CATEGORIES = {
  "Idols & Advantages": ["FIND_IDOL", "ACQUIRE_IDOL", "FIND_ADVANTAGE", "ACQUIRE_ADVANTAGE", "VOTED_OUT_WITH_IDOL"],
  "Challenges": ["WIN_IMMUNITY", "CATCH_TOSS", "DROP_TOSS"],
  "Tribal & Survival": ["TRIBAL_VOTE_CORRECT", "SURVIVE_PRE", "SURVIVE_POST", "VOTED_OUT", "QUIT"],
  "Milestones": ["MAKE_JURY", "MAKE_FINAL", "WIN_SURVIVOR"],
  "Miscellaneous": ["CRY", "EPISODE_TITLE", "MISC_25", "MISC_50", "MISC_NEG_10", "MISC_NEG_25"],
};

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

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  config: ScoringConfig;
  created_at: string;
}

// ScoringConfig can have number (enabled) or null (disabled), plus custom_actions array
type ScoringConfig = Record<string, number | null | CustomScoringAction[]>;

// Build default config from SCORING_ACTIONS (all enabled)
const getDefaultScoringConfig = (): ScoringConfig => {
  const config: ScoringConfig = {};
  Object.entries(SCORING_ACTIONS).forEach(([key, value]) => {
    config[key] = value.points;
  });
  return config;
};

const isActionEnabled = (key: string, config: ScoringConfig): boolean => {
  return config[key] !== null;
};

// Generate a unique ID for custom actions
const generateCustomActionId = () => `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
  
  // Custom actions state
  const [customActions, setCustomActions] = useState<CustomScoringAction[]>([]);
  const [newActionLabel, setNewActionLabel] = useState("");
  const [newActionEmoji, setNewActionEmoji] = useState("⭐");
  const [newActionPoints, setNewActionPoints] = useState(10);
  
  // Saved templates state
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateEmoji, setNewTemplateEmoji] = useState("⭐");
  const [savingTemplate, setSavingTemplate] = useState(false);

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
        const savedConfig = leagueData.scoring_config as ScoringConfig;
        const mergedConfig = { ...getDefaultScoringConfig(), ...savedConfig };
        setScoringConfig(mergedConfig);
        // Load custom actions
        const loadedCustomActions = getCustomActions(savedConfig);
        setCustomActions(loadedCustomActions);
      }

      // Fetch saved templates for this league
      const { data: templatesData } = await supabase
        .from("scoring_templates")
        .select("id, name, description, emoji, config, created_at")
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false });
      
      if (templatesData) {
        setSavedTemplates(templatesData as SavedTemplate[]);
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
    // Include custom actions in the config - cast for JSON compatibility
    const configToSave: Record<string, unknown> = {
      ...scoringConfig,
      custom_actions: customActions,
    };
    const { error } = await supabase
      .from("leagues")
      .update({ scoring_config: configToSave as Record<string, number> })
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

  const handleScoringToggle = (key: string, enabled: boolean) => {
    if (enabled) {
      // Re-enable with default points
      const defaultPoints = SCORING_ACTIONS[key as keyof typeof SCORING_ACTIONS]?.points ?? 0;
      setScoringConfig(prev => ({ ...prev, [key]: defaultPoints }));
    } else {
      // Disable by setting to null
      setScoringConfig(prev => ({ ...prev, [key]: null }));
    }
  };

  const handleResetToDefaults = () => {
    setScoringConfig(getDefaultScoringConfig());
    setCustomActions([]);
    toast.success("Scoring rules reset to defaults (save to apply)");
  };

  const hasUnsavedScoringChanges = () => {
    const savedConfig = league?.scoring_config || {};
    const defaults = getDefaultScoringConfig();
    
    // Check default actions
    const defaultsChanged = Object.keys(SCORING_ACTIONS).some(key => {
      const currentValue = scoringConfig[key];
      const savedValue = (savedConfig as Record<string, number>)[key] ?? defaults[key];
      return currentValue !== savedValue;
    });
    
    // Check custom actions
    const savedCustomActions = getCustomActions(savedConfig as ScoringConfig);
    const customActionsChanged = JSON.stringify(customActions) !== JSON.stringify(savedCustomActions);
    
    return defaultsChanged || customActionsChanged;
  };

  // Custom action handlers
  const handleAddCustomAction = () => {
    if (!newActionLabel.trim()) {
      toast.error("Please enter a label for the action");
      return;
    }
    
    // Check for duplicate labels
    const allLabels = [
      ...Object.values(SCORING_ACTIONS).map(a => a.label.toLowerCase()),
      ...customActions.map(a => a.label.toLowerCase()),
    ];
    if (allLabels.includes(newActionLabel.trim().toLowerCase())) {
      toast.error("An action with this label already exists");
      return;
    }
    
    const newAction: CustomScoringAction = {
      id: generateCustomActionId(),
      label: newActionLabel.trim(),
      emoji: newActionEmoji,
      points: newActionPoints,
    };
    
    setCustomActions(prev => [...prev, newAction]);
    setNewActionLabel("");
    setNewActionEmoji("⭐");
    setNewActionPoints(10);
    toast.success("Custom action added (save to apply)");
  };

  const handleUpdateCustomAction = (actionId: string, updates: Partial<CustomScoringAction>) => {
    setCustomActions(prev => prev.map(a => 
      a.id === actionId ? { ...a, ...updates } : a
    ));
  };

  const handleDeleteCustomAction = (actionId: string) => {
    setCustomActions(prev => prev.filter(a => a.id !== actionId));
    toast.success("Custom action removed (save to apply)");
  };

  // Save current config as a template
  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!currentUserId) return;
    
    setSavingTemplate(true);
    
    // Build config to save (current scoring config + custom actions)
    const configToSave = {
      ...scoringConfig,
      custom_actions: customActions,
    };
    
    const { data, error } = await supabase
      .from("scoring_templates")
      .insert({
        league_id: leagueId,
        name: newTemplateName.trim(),
        description: newTemplateDescription.trim() || null,
        emoji: newTemplateEmoji,
        config: configToSave,
        created_by: currentUserId,
      } as any)
      .select()
      .single();
    
    if (error) {
      toast.error("Failed to save template");
    } else {
      toast.success(`Template "${newTemplateName}" saved`);
      setSavedTemplates(prev => [data as SavedTemplate, ...prev]);
      setSaveTemplateDialogOpen(false);
      setNewTemplateName("");
      setNewTemplateDescription("");
      setNewTemplateEmoji("⭐");
    }
    
    setSavingTemplate(false);
  };

  // Delete a saved template
  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    const { error } = await supabase
      .from("scoring_templates")
      .delete()
      .eq("id", templateId);
    
    if (error) {
      toast.error("Failed to delete template");
    } else {
      toast.success(`Template "${templateName}" deleted`);
      setSavedTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  // Apply a saved template
  const handleApplySavedTemplate = (template: SavedTemplate) => {
    const config = template.config as ScoringConfig;
    const mergedConfig = { ...getDefaultScoringConfig(), ...config };
    setScoringConfig(mergedConfig);
    const loadedCustomActions = getCustomActions(config);
    setCustomActions(loadedCustomActions);
    toast.success(`Applied "${template.name}" template`);
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
            Apply a template or customize individual point values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Scoring Templates */}
            {isOwner && (
              <div className="space-y-4 pb-4 border-b border-border">
                {/* Predefined Templates */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Predefined Templates</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {SCORING_TEMPLATES.map((template) => (
                      <AlertDialog key={template.id}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-auto py-2 px-3 flex flex-col items-center gap-1 hover:bg-accent/50 transition-colors"
                          >
                            <span className="text-xl">{template.emoji}</span>
                            <span className="text-xs font-medium">{template.name}</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <span className="text-2xl">{template.emoji}</span>
                              Apply "{template.name}" Template
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {template.description}. This will replace your current scoring configuration. Custom actions will be preserved.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="max-h-64 overflow-y-auto space-y-3 my-4 text-sm">
                            {/* Summary */}
                            {(() => {
                              const enabledCount = Object.values(template.config).filter(v => v !== null).length;
                              const totalCount = Object.keys(SCORING_ACTIONS).length;
                              return (
                                <div className="flex items-center gap-2 pb-2 border-b border-border">
                                  <Badge variant={enabledCount === totalCount ? "default" : "secondary"}>
                                    {enabledCount} of {totalCount} actions enabled
                                  </Badge>
                                </div>
                              );
                            })()}
                            
                            {/* Enabled actions */}
                            <div>
                              <p className="font-medium mb-2 text-foreground">Enabled:</p>
                              <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                                {Object.entries(template.config)
                                  .filter(([_, value]) => value !== null)
                                  .slice(0, 8)
                                  .map(([key, value]) => {
                                    const action = SCORING_ACTIONS[key as keyof typeof SCORING_ACTIONS];
                                    if (!action) return null;
                                    return (
                                      <div key={key} className="flex justify-between text-xs">
                                        <span className="truncate">{action.emoji} {action.label.replace(` ${action.emoji}`, '').slice(0, 12)}</span>
                                        <span className={(value as number) < 0 ? 'text-destructive' : 'text-green-600'}>
                                          {(value as number) > 0 ? '+' : ''}{value as number}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                              {Object.entries(template.config).filter(([_, v]) => v !== null).length > 8 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  +{Object.entries(template.config).filter(([_, v]) => v !== null).length - 8} more...
                                </p>
                              )}
                            </div>
                            
                            {/* Disabled actions */}
                            {Object.values(template.config).some(v => v === null) && (
                              <div>
                                <p className="font-medium mb-2 text-muted-foreground">Disabled:</p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(template.config)
                                    .filter(([_, value]) => value === null)
                                    .map(([key]) => {
                                      const action = SCORING_ACTIONS[key as keyof typeof SCORING_ACTIONS];
                                      if (!action) return null;
                                      return (
                                        <span key={key} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground line-through">
                                          {action.emoji} {action.label.replace(` ${action.emoji}`, '').slice(0, 10)}
                                        </span>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                const newConfig = applyTemplate(template.id, scoringConfig);
                                setScoringConfig(newConfig);
                                // Preserve custom actions in state
                                const existingCustom = getCustomActions(scoringConfig);
                                setCustomActions(existingCustom);
                                toast.success(`Applied "${template.name}" template`);
                              }}
                            >
                              Apply Template
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ))}
                  </div>
                </div>

                {/* Saved Templates */}
                {savedTemplates.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Bookmark className="h-4 w-4" />
                      Your Saved Templates
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {savedTemplates.map((template) => (
                        <div key={template.id} className="relative group">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-auto py-2 px-3 flex flex-col items-center gap-1 hover:bg-accent/50 transition-colors border-primary/30"
                              >
                                <span className="text-xl">{template.emoji}</span>
                                <span className="text-xs font-medium truncate max-w-full">{template.name}</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <span className="text-2xl">{template.emoji}</span>
                                  Apply "{template.name}"
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {template.description || "Your saved template"}. This will replace your current scoring configuration.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleApplySavedTemplate(template)}>
                                  Apply Template
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          {/* Delete button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTemplate(template.id, template.name)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Current Config as Template */}
                <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Bookmark className="h-4 w-4" />
                      Save Current as Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Scoring Template</DialogTitle>
                      <DialogDescription>
                        Save your current scoring configuration as a template to reuse in future seasons.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-center gap-3">
                        <EmojiPicker value={newTemplateEmoji} onChange={setNewTemplateEmoji} />
                        <Input
                          placeholder="Template name"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      <Input
                        placeholder="Description (optional)"
                        value={newTemplateDescription}
                        onChange={(e) => setNewTemplateDescription(e.target.value)}
                      />
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          const enabledCount = Object.entries(scoringConfig).filter(([k, v]) => v !== null && k !== 'custom_actions').length;
                          return `This will save ${enabledCount} enabled actions and ${customActions.length} custom action(s).`;
                        })()}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSaveTemplateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveAsTemplate} disabled={savingTemplate || !newTemplateName.trim()}>
                        {savingTemplate ? "Saving..." : "Save Template"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            <TooltipProvider>
              {Object.entries(SCORING_CATEGORIES).map(([category, actionKeys]) => (
                <Collapsible key={category} defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <span className="font-semibold text-sm">{category}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-2 pl-2">
                      {actionKeys.map((key) => {
                        const action = SCORING_ACTIONS[key as keyof typeof SCORING_ACTIONS];
                        if (!action) return null;
                        const enabled = isActionEnabled(key, scoringConfig);
                        
                        return (
                          <div 
                            key={key} 
                            className={`flex items-center justify-between gap-4 py-2 px-2 rounded-md transition-opacity ${
                              !enabled ? 'opacity-50 bg-muted/30' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isOwner && (
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={(checked) => handleScoringToggle(key, checked)}
                                />
                              )}
                              <span className="text-lg">{action.emoji}</span>
                              <span className={`text-sm font-medium ${!enabled ? 'line-through text-muted-foreground' : ''}`}>
                                {action.label.replace(` ${action.emoji}`, '')}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p>{action.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex items-center gap-2">
                              {enabled ? (
                                <>
                                  <Input
                                    type="number"
                                    value={typeof scoringConfig[key] === 'number' ? scoringConfig[key] : action.points}
                                    onChange={(e) => handleScoringChange(key, parseInt(e.target.value) || 0)}
                                    className="w-20 text-right h-8"
                                    disabled={!isOwner}
                                  />
                                  <span className="text-sm text-muted-foreground w-6">pts</span>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Disabled</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </TooltipProvider>

            {/* Custom Scoring Rules Section */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20">
                <span className="font-semibold text-sm">✨ Custom Scoring Rules</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-3 pl-2">
                  {customActions.length === 0 && !isOwner && (
                    <p className="text-sm text-muted-foreground py-2">No custom scoring rules defined.</p>
                  )}
                  
                  {/* Existing custom actions */}
                  {customActions.map((action) => (
                    <div 
                      key={action.id} 
                      className="flex items-center justify-between gap-4 py-2 px-2 rounded-md bg-muted/30"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <EmojiPicker
                          value={action.emoji}
                          onChange={(emoji) => handleUpdateCustomAction(action.id, { emoji })}
                          disabled={!isOwner}
                        />
                        <Input
                          value={action.label}
                          onChange={(e) => handleUpdateCustomAction(action.id, { label: e.target.value })}
                          className="flex-1 h-8"
                          disabled={!isOwner}
                          placeholder="Action label"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={action.points}
                          onChange={(e) => handleUpdateCustomAction(action.id, { points: parseInt(e.target.value) || 0 })}
                          className="w-20 text-right h-8"
                          disabled={!isOwner}
                        />
                        <span className="text-sm text-muted-foreground w-6">pts</span>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCustomAction(action.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Add new custom action form */}
                  {isOwner && (
                    <div className="border-t border-border pt-3 mt-3">
                      <p className="text-sm text-muted-foreground mb-2">Add Custom Action:</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <EmojiPicker
                          value={newActionEmoji}
                          onChange={setNewActionEmoji}
                        />
                        <Input
                          value={newActionLabel}
                          onChange={(e) => setNewActionLabel(e.target.value)}
                          className="flex-1 min-w-[150px] h-9"
                          placeholder="Action label (e.g., Wins Reward)"
                        />
                        <Input
                          type="number"
                          value={newActionPoints}
                          onChange={(e) => setNewActionPoints(parseInt(e.target.value) || 0)}
                          className="w-20 text-right h-9"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                        <Button
                          onClick={handleAddCustomAction}
                          size="sm"
                          className="h-9"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {isOwner && (
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <Button 
                  variant="outline"
                  onClick={handleResetToDefaults}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
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
