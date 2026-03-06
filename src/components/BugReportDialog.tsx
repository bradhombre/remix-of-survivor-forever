import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId?: string;
}

export function BugReportDialog({ open, onOpenChange, leagueId }: BugReportDialogProps) {
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!user || !description.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("bug_reports").insert({
      user_id: user.id,
      description: description.trim().slice(0, 2000),
      page_url: window.location.href,
      league_id: leagueId || null,
    } as any);
    if (error) {
      toast.error("Failed to submit bug report");
    } else {
      toast.success("Bug report submitted — thank you!");
      setDescription("");
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Describe the issue you encountered. We'll look into it!
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="What went wrong?"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
          rows={5}
        />
        <p className="text-xs text-muted-foreground text-right">
          {description.length}/2000
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !description.trim()}
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
