import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bug } from "lucide-react";
import { BugReportDialog } from "@/components/BugReportDialog";
import { DonateButton } from "@/components/DonateButton";

export function AppFooter() {
  const [bugOpen, setBugOpen] = useState(false);
  const location = useLocation();
  const leagueMatch = location.pathname.match(/^\/league\/([a-f0-9-]+)/i);
  const leagueId = leagueMatch?.[1];

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-plank bg-card/95 px-4 py-2 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBugOpen(true)}
              className="flex min-h-[32px] items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bug className="h-3 w-3" />
              Report a Bug
            </button>
            <span className="text-border">|</span>
            <DonateButton />
          </div>
          <p className="text-center text-[11px] leading-tight text-muted-foreground">
            Survivors Ready is a free fan game. Not affiliated with CBS or the show.
          </p>
        </div>
      </footer>
      <BugReportDialog open={bugOpen} onOpenChange={setBugOpen} leagueId={leagueId} />
    </>
  );
}
