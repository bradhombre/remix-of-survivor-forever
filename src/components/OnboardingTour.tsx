import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  description: string;
}

interface OnboardingTourProps {
  leagueId: string;
  isLeagueAdmin: boolean;
  isSuperAdmin?: boolean;
}

const PLAYER_STEPS: TourStep[] = [
  {
    target: "play",
    title: "Play Tab 🏆",
    description:
      "This is where your fantasy game lives. During the draft, you'll pick Survivor contestants for your team. Once the game starts, your commissioner scores events each episode.",
  },
  {
    target: "league",
    title: "League Tab 👥",
    description:
      "See who's in your league, customize your team name and avatar, and share the invite code with friends.",
  },
  {
    target: "chat",
    title: "League Chat 💬",
    description:
      "Chat with your league mates and ask @jeffbot any Survivor question — trivia, strategy, history.",
  },
];

const ADMIN_STEP: TourStep = {
  target: "admin",
  title: "Admin Tab 🛡️",
  description:
    "Manage your cast, scoring settings, and league configuration. You'll use this to score events during each episode.",
};

export function OnboardingTour({ leagueId, isLeagueAdmin, isSuperAdmin }: OnboardingTourProps) {
  const storageKey = `tour-seen-${leagueId}`;
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>();

  const steps: TourStep[] = [
    ...PLAYER_STEPS,
    ...(isLeagueAdmin ? [ADMIN_STEP] : []),
  ];

  // Auto-start after delay if not seen (skip for super admins)
  useEffect(() => {
    if (isSuperAdmin) return;
    if (localStorage.getItem(storageKey) === "true") return;
    const timer = setTimeout(() => setActive(true), 800);
    return () => clearTimeout(timer);
  }, [storageKey, isSuperAdmin]);

  const positionPopover = useCallback(() => {
    if (!active) return;
    const step = steps[stepIndex];
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
    }
    rafRef.current = requestAnimationFrame(positionPopover);
  }, [active, stepIndex, steps]);

  useEffect(() => {
    if (active) {
      rafRef.current = requestAnimationFrame(positionPopover);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, positionPopover]);

  const finish = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setActive(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [storageKey]);

  const next = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      finish();
    }
  };

  const back = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  if (!active || !rect) return null;

  const step = steps[stepIndex];
  const padding = 6;

  // Position popover below or above target
  const popoverTop = rect.bottom + 12;
  const popoverLeft = Math.max(12, Math.min(rect.left, window.innerWidth - 320));
  const fitsBelow = popoverTop + 200 < window.innerHeight;

  return createPortal(
    <div className="fixed inset-0 z-[100]" onClick={finish}>
      {/* Backdrop with cutout using clip-path */}
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-300"
        style={{
          clipPath: `polygon(
            0% 0%, 0% 100%, 
            ${rect.left - padding}px 100%, 
            ${rect.left - padding}px ${rect.top - padding}px, 
            ${rect.right + padding}px ${rect.top - padding}px, 
            ${rect.right + padding}px ${rect.bottom + padding}px, 
            ${rect.left - padding}px ${rect.bottom + padding}px, 
            ${rect.left - padding}px 100%, 
            100% 100%, 100% 0%
          )`,
        }}
      />

      {/* Highlight ring */}
      <div
        className="absolute rounded-lg ring-2 ring-primary/80 ring-offset-2 ring-offset-transparent pointer-events-none transition-all duration-300"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }}
      />

      {/* Popover */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute w-[300px] bg-popover border border-border rounded-lg shadow-xl p-4 transition-all duration-300 animate-in fade-in-0 zoom-in-95"
        style={{
          top: fitsBelow ? popoverTop : rect.top - 12,
          left: popoverLeft,
          ...(fitsBelow ? {} : { transform: "translateY(-100%)" }),
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-sm">{step.title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={finish}
            className="h-6 w-6 p-0 -mt-1 -mr-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {stepIndex + 1} of {steps.length}
          </span>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="ghost" size="sm" onClick={back}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {stepIndex === steps.length - 1 ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
