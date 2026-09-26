import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SunOProps {
  /** Share of the disc covered by water, 0–1 (0.42 in the short lockup) */
  water?: number;
  /** Leave the water half transparent so a real scene shows through (landing hero) */
  seeThrough?: boolean;
}

/** The O in SURVIVORS: an orange sun rising out of striped water. Sized in em, so it follows the text. */
export const SunO = forwardRef<HTMLSpanElement, SunOProps>(function SunO(
  { water = 0.42, seeThrough = false },
  ref
) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="relative mx-[0.03em] inline-block h-[0.72em] w-[0.72em] overflow-hidden rounded-full align-[-0.01em]"
      style={{
        background: seeThrough
          ? `linear-gradient(180deg, hsl(var(--sunset)) 0 ${100 - water * 100}%, transparent ${100 - water * 100}%)`
          : "hsl(var(--sunset))",
      }}
    >
      {!seeThrough && (
        <span
          className="absolute inset-x-0 bottom-0"
          style={{
            height: `${water * 100}%`,
            background:
              "repeating-linear-gradient(180deg, hsl(var(--ocean)) 0 0.08em, hsl(var(--ocean-stripe)) 0.08em 0.12em)",
          }}
        />
      )}
    </span>
  );
});

interface LockupProps {
  className?: string;
  /** Show READY on the same line (short lockup). */
  withReady?: boolean;
}

/**
 * Short lockup: SURVIV☉RS READY in Rubik Dirt.
 * Color comes from the parent's text color, so it works on canopy headers and light pages.
 */
export function Lockup({ className, withReady = true }: LockupProps) {
  return (
    <span
      className={cn("font-display inline-flex items-baseline whitespace-nowrap leading-none", className)}
      role="img"
      aria-label="Survivors Ready"
    >
      <span aria-hidden="true">SURVIV</span>
      <SunO />
      <span aria-hidden="true">RS{withReady ? " READY" : ""}</span>
    </span>
  );
}
