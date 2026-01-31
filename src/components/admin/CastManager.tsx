import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Upload, Trash2, Pencil, Check, X, Users } from "lucide-react";
import { toast } from "sonner";

interface MasterContestant {
  id: string;
  season_number: number;
  name: string;
  image_url: string | null;
  tribe: string | null;
  age: number | null;
  occupation: string | null;
  created_at: string;
}

export function CastManager() {
  const [season, setSeason] = useState(49);
  const [contestants, setContestants] = useState<MasterContestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingSeasons, setExistingSeasons] = useState<number[]>([]);

  // Add/Edit state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    tribe: "",
    age: "",
    occupation: "",
    image_url: "",
  });
  const [bulkText, setBulkText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch available seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      const { data } = await supabase
        .from("master_contestants")
        .select("season_number")
        .order("season_number", { ascending: false });

      if (data) {
        const uniqueSeasons = [...new Set(data.map((d) => d.season_number))];
        setExistingSeasons(uniqueSeasons);
      }
    };
    fetchSeasons();
  }, []);

  // Fetch contestants for selected season
  const fetchContestants = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("master_contestants")
      .select("*")
      .eq("season_number", season)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching contestants:", error);
      toast.error("Failed to load cast");
    } else {
      setContestants(data || []);
    }
    setLoading(false);
  }, [season]);

  useEffect(() => {
    fetchContestants();
  }, [fetchContestants]);

  const resetForm = () => {
    setFormData({ name: "", tribe: "", age: "", occupation: "", image_url: "" });
    setEditingId(null);
  };

  const handleAddContestant = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("master_contestants").insert({
      season_number: season,
      name: formData.name.trim(),
      tribe: formData.tribe.trim() || null,
      age: formData.age ? parseInt(formData.age) : null,
      occupation: formData.occupation.trim() || null,
      image_url: formData.image_url.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("A contestant with this name already exists for this season");
      } else {
        toast.error("Failed to add contestant");
      }
    } else {
      toast.success(`Added ${formData.name}`);
      resetForm();
      setShowAddDialog(false);
      fetchContestants();
    }
    setIsSaving(false);
  };

  const handleUpdateContestant = async (id: string) => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("master_contestants")
      .update({
        name: formData.name.trim(),
        tribe: formData.tribe.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        occupation: formData.occupation.trim() || null,
        image_url: formData.image_url.trim() || null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update contestant");
    } else {
      toast.success("Contestant updated");
      setEditingId(null);
      fetchContestants();
    }
    setIsSaving(false);
  };

  const handleDeleteContestant = async (id: string, name: string) => {
    const { error } = await supabase
      .from("master_contestants")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete contestant");
    } else {
      toast.success(`Deleted ${name}`);
      fetchContestants();
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split("\n").filter((line) => line.trim());
    const toInsert: Array<{
      season_number: number;
      name: string;
      tribe: string | null;
      age: number | null;
      occupation: string | null;
      image_url: string | null;
    }> = [];

    // Parse CSV: name, tribe, age, occupation, image_url
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      const name = parts[0];
      if (!name) continue;

      toInsert.push({
        season_number: season,
        name,
        tribe: parts[1] || null,
        age: parts[2] ? parseInt(parts[2]) : null,
        occupation: parts[3] || null,
        image_url: parts[4] || null,
      });
    }

    if (toInsert.length === 0) {
      toast.error("No valid contestants found");
      return;
    }

    setIsSaving(true);
    const { error, data } = await supabase
      .from("master_contestants")
      .insert(toInsert)
      .select();

    if (error) {
      if (error.code === "23505") {
        toast.error("Some contestants already exist. Try removing duplicates.");
      } else {
        toast.error("Failed to import contestants");
      }
    } else {
      toast.success(`Imported ${data?.length || 0} contestants for Season ${season}`);
      setBulkText("");
      setShowBulkDialog(false);
      fetchContestants();
      // Update existing seasons list
      if (!existingSeasons.includes(season)) {
        setExistingSeasons([season, ...existingSeasons].sort((a, b) => b - a));
      }
    }
    setIsSaving(false);
  };

  const startEditing = (contestant: MasterContestant) => {
    setEditingId(contestant.id);
    setFormData({
      name: contestant.name,
      tribe: contestant.tribe || "",
      age: contestant.age?.toString() || "",
      occupation: contestant.occupation || "",
      image_url: contestant.image_url || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    resetForm();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Master Cast Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Season Selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="season-select">Season:</Label>
            <Input
              id="season-select"
              type="number"
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value) || 1)}
              className="w-24"
              min={1}
            />
          </div>

          {existingSeasons.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Quick select:</span>
              {existingSeasons.slice(0, 5).map((s) => (
                <Button
                  key={s}
                  variant={s === season ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSeason(s)}
                >
                  S{s}
                </Button>
              ))}
            </div>
          )}

          <div className="flex gap-2 ml-auto">
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Contestant
            </Button>
            <Button onClick={() => setShowBulkDialog(true)} variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1" />
              Bulk Import
            </Button>
          </div>
        </div>

        {/* Contestants Table */}
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : contestants.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">No cast added yet for Season {season}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Contestant
              </Button>
              <Button onClick={() => setShowBulkDialog(true)} variant="outline">
                <Upload className="h-4 w-4 mr-1" />
                Bulk Import
              </Button>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tribe</TableHead>
                  <TableHead className="text-center">Age</TableHead>
                  <TableHead>Occupation</TableHead>
                  <TableHead>Image URL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contestants.map((c) =>
                  editingId === c.id ? (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Input
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formData.tribe}
                          onChange={(e) =>
                            setFormData({ ...formData, tribe: e.target.value })
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={formData.age}
                          onChange={(e) =>
                            setFormData({ ...formData, age: e.target.value })
                          }
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formData.occupation}
                          onChange={(e) =>
                            setFormData({ ...formData, occupation: e.target.value })
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formData.image_url}
                          onChange={(e) =>
                            setFormData({ ...formData, image_url: e.target.value })
                          }
                          className="h-8"
                          placeholder="https://..."
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateContestant(c.id)}
                            disabled={isSaving}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.tribe || "—"}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {c.age || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.occupation || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {c.image_url ? (
                          <a
                            href={c.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Contestant</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {c.name}? This action
                                  cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteContestant(c.id, c.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {contestants.length} contestant{contestants.length !== 1 ? "s" : ""} for Season{" "}
          {season}
        </p>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contestant to Season {season}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-name">Name *</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contestant name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-tribe">Tribe</Label>
                  <Input
                    id="add-tribe"
                    value={formData.tribe}
                    onChange={(e) =>
                      setFormData({ ...formData, tribe: e.target.value })
                    }
                    placeholder="Tribe name"
                  />
                </div>
                <div>
                  <Label htmlFor="add-age">Age</Label>
                  <Input
                    id="add-age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Age"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-occupation">Occupation</Label>
                <Input
                  id="add-occupation"
                  value={formData.occupation}
                  onChange={(e) =>
                    setFormData({ ...formData, occupation: e.target.value })
                  }
                  placeholder="Occupation"
                />
              </div>
              <div>
                <Label htmlFor="add-image">Image URL</Label>
                <Input
                  id="add-image"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddContestant} disabled={isSaving}>
                {isSaving ? "Adding..." : "Add Contestant"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Import Cast for Season {season}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste CSV data with columns: name, tribe, age, occupation, image_url (one
                contestant per line)
              </p>
              <Textarea
                placeholder="John Doe, Luvu, 32, Firefighter, https://example.com/john.jpg&#10;Jane Smith, Yase, 28, Attorney,"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkImport} disabled={isSaving || !bulkText.trim()}>
                {isSaving ? "Importing..." : "Import All"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
