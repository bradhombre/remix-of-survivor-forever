import { useState } from "react";
import { useParams } from "react-router-dom";
import { Bug } from "lucide-react";
import { BugReportDialog } from "@/components/BugReportDialog";
import { DonateButton } from "@/components/DonateButton";

export function AppFooter() {
  const [bugOpen, setBugOpen] = useState(false);
  const params = useParams<{ id?: string }>();
  const leagueId = params.id;

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-t border-border py-2 px-4">
        <div className="container mx-auto flex items-center justify-center gap-4">
          <button
            onClick={() => setBugOpen(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bug className="h-3 w-3" />
            Report a Bug
          </button>
          <span className="text-border">|</span>
          <DonateButton />
        </div>
      </footer>
      <BugReportDialog open={bugOpen} onOpenChange={setBugOpen} leagueId={leagueId} />
    </>
  );
}
