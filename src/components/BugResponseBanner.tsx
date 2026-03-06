import { useState } from "react";
import { useBugNotifications } from "@/hooks/useBugNotifications";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";

export function BugResponseBanner() {
  const { user } = useAuth();
  const { unreadResponses, markAsViewed } = useBugNotifications(user?.id);
  const [dismissed, setDismissed] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  if (dismissed || !unreadResponses.length) return null;

  const handleView = () => setViewOpen(true);

  const handleDismiss = () => {
    markAsViewed(unreadResponses.map((r) => r.id));
    setDismissed(true);
    setViewOpen(false);
  };

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
        <div className="flex items-center gap-3 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 shadow-lg">
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">
            You have {unreadResponses.length === 1 ? "a response" : `${unreadResponses.length} responses`} to your bug report{unreadResponses.length > 1 ? "s" : ""}!
          </span>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            onClick={handleView}
          >
            View
          </Button>
          <button onClick={handleDismiss} className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bug Report Updates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {unreadResponses.map((r) => (
              <div key={r.id} className="space-y-1.5 p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  Your report: "{r.description}"
                </p>
                <p className="text-sm">{r.admin_notes}</p>
                <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                  {r.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleDismiss} className="w-full">Got it, thanks!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
