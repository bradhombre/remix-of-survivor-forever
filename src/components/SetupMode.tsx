import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Shuffle, Upload, Download, Trash2, Play, List, GripVertical, Pencil, Check, X } from "lucide-react";
import { Player, Contestant, DraftType } from "@/types/survivor";
import { useToast } from "@/hooks/use-toast";

interface SetupModeProps {
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
      // Support CSV format: Name, Age, Location, Tribe
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
        
        // Skip header if present
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
    e.target.value = ''; // Reset input
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

        {/* Draft Settings */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">🎲 Draft Settings</h2>
          
          <div>
            <Label>Draft Order (drag to reorder)</Label>
            <div className="space-y-2 mt-2">
              {draftOrder.map((player, index) => (
                <div key={player} className="glass p-3 rounded-lg flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <span className="font-bold text-accent">{index + 1}</span>
                  <span className="flex-1 font-medium">{player}</span>
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
              ))}
              <Button onClick={onRandomizeDraftOrder} variant="outline" className="w-full">
                <Shuffle className="mr-2 h-4 w-4" />
                Randomize Order
              </Button>
            </div>
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
          <h2 className="text-2xl font-bold text-foreground">➕ Add Contestants</h2>
          <Button
            onClick={() => setShowBulkImport(!showBulkImport)}
            variant="outline"
            size="sm"
          >
            <List className="mr-2 h-4 w-4" />
            {showBulkImport ? "Single Add" : "Bulk Import"}
          </Button>
        </div>

        {showBulkImport ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleCSVFileImport}
                    className="hidden"
                  />
                </label>
              </Button>
              <div className="flex-1" />
            </div>
            <div>
              <Label htmlFor="bulk-import">Paste contestant list (CSV format)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Format: Name, Age, Location, Tribe (one per line)
              </p>
              <Textarea
                id="bulk-import"
                placeholder="Example:&#10;Stephanie Berger, 35, Miami FL, Vula&#10;Kyle Fraser, 28, Austin TX, Civa&#10;Eva Erickson, 42, Seattle WA"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="glass min-h-[200px] font-mono text-sm"
              />
            </div>
            <Button onClick={handleBulkImport} variant="success" className="w-full">
              Import All Contestants
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="contestant-name">Name *</Label>
                <Input
                  id="contestant-name"
                  placeholder="Contestant Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddContestant()}
                  className="glass mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contestant-age">Age</Label>
                <Input
                  id="contestant-age"
                  type="number"
                  placeholder="Age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddContestant()}
                  className="glass mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contestant-location">Location</Label>
                <Input
                  id="contestant-location"
                  placeholder="City, State"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddContestant()}
                  className="glass mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contestant-tribe">Tribe</Label>
                <Input
                  id="contestant-tribe"
                  placeholder="Tribe Name"
                  value={tribe}
                  onChange={(e) => setTribe(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddContestant()}
                  className="glass mt-1"
                />
              </div>
            </div>
            <Button onClick={handleAddContestant} variant="success" className="w-full">
              Add Contestant
            </Button>
          </>
        )}

        <div className="text-sm text-muted-foreground">
          {contestants.length} contestants added (minimum 16 required)
        </div>
      </Card>

      {/* Contestants List */}
      {contestants.length > 0 && (
        <Card className="glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">👥 Contestants</h2>
            <Button
              onClick={() => {
                if (confirm(`Clear all ${contestants.length} contestants? This cannot be undone.`)) {
                  onSetContestants([]);
                  toast({
                    title: "Contestants Cleared! 🗑️",
                    description: "All contestants have been removed.",
                  });
                }
              }}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contestants.map((contestant) => {
              const isEditing = editingId === contestant.id;
              
              return (
                <div
                  key={contestant.id}
                  className="glass-strong p-4 rounded-lg"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                        className="h-8"
                      />
                      <Input
                        value={editTribe}
                        onChange={(e) => setEditTribe(e.target.value)}
                        placeholder="Tribe (optional)"
                        className="h-8"
                      />
                      <Input
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        placeholder="Age (optional)"
                        type="number"
                        className="h-8"
                      />
                      <Input
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Location (optional)"
                        className="h-8"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            if (editName.trim()) {
                              onUpdateContestant(contestant.id, {
                                name: editName.trim(),
                                tribe: editTribe.trim() || undefined,
                                age: editAge ? parseInt(editAge) : undefined,
                                location: editLocation.trim() || undefined,
                              });
                              setEditingId(null);
                              toast({
                                title: "Contestant Updated! ✏️",
                                description: `${editName} has been updated.`,
                              });
                            }
                          }}
                          size="sm"
                          variant="success"
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          size="sm"
                          variant="ghost"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{contestant.name}</p>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          {contestant.age && <p>Age: {contestant.age}</p>}
                          {contestant.location && <p className="truncate">{contestant.location}</p>}
                          {contestant.tribe && <p>Tribe: {contestant.tribe}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          onClick={() => {
                            setEditingId(contestant.id);
                            setEditName(contestant.name);
                            setEditTribe(contestant.tribe || "");
                            setEditAge(contestant.age?.toString() || "");
                            setEditLocation(contestant.location || "");
                          }}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => onDeleteContestant(contestant.id)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Start Draft Button */}
      <div className="flex justify-center">
        <Button
          onClick={onStartDraft}
          disabled={!canStartDraft}
          size="lg"
          variant="accent"
          className="text-xl px-12 py-6"
        >
          <Play className="mr-2 h-6 w-6" />
          Start Draft
        </Button>
      </div>
    </div>
  );
};
