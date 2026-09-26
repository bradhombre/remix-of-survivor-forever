import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SunO } from "@/components/Lockup";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate("/leagues");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const joinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) navigate(`/join/${encodeURIComponent(clean)}`);
  };

  const titleShadow = {
    textShadow:
      "3px 3px 0 #121611, -1px -1px 0 #121611, 1px -1px 0 #121611, -1px 1px 0 #121611",
  } as const;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero scene: sky, horizon, ocean, islands */}
      <section className="relative h-[430px] sm:h-[480px] overflow-hidden bg-sky" aria-label="Survivors Ready">
        {/* Ocean below the horizon */}
        <div
          className="absolute inset-x-0 bottom-0 top-[230px] sm:top-[260px]"
          style={{
            background:
              "repeating-linear-gradient(180deg, hsl(var(--ocean)) 0 8px, hsl(var(--ocean-stripe)) 8px 12px)",
          }}
        />
        {/* Islands */}
        <span
          aria-hidden="true"
          className="absolute right-[-60px] top-[210px] sm:top-[240px] h-10 w-[150px] sm:w-[220px] bg-[#1D3326]"
          style={{ borderRadius: "50% 50% 0 0 / 100% 100% 0 0" }}
        />
        <span
          aria-hidden="true"
          className="absolute right-2 sm:right-10 top-[120px] sm:top-[140px] h-24 w-24 sm:h-28 sm:w-28 bg-[#1D3326]"
          style={{
            transform: "scaleX(-1)",
            WebkitMask: "url(/brand/gi-palm-tree.svg) center / contain no-repeat",
            mask: "url(/brand/gi-palm-tree.svg) center / contain no-repeat",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute left-[-30px] top-[220px] sm:top-[250px] h-5 w-[100px] bg-[#24402F]"
          style={{ borderRadius: "50% 50% 0 0 / 100% 100% 0 0" }}
        />

        {/* Top bar */}
        <div className="relative container max-w-5xl mx-auto px-5 pt-5 flex items-center justify-between">
          <span className="font-label text-base tracking-[0.2em] text-[#1D3326]">FREE FANTASY LEAGUE</span>
          <button
            onClick={() => navigate("/auth")}
            className="min-h-[44px] px-1 text-base font-bold text-[#1D3326] hover:underline"
          >
            Sign in
          </button>
        </div>

        {/* Wordmark sitting on the horizon: the sun rises out of the real water */}
        <div className="absolute inset-x-0 top-[180px] sm:top-[205px]">
          <div className="container max-w-5xl mx-auto px-5">
            <h1 className="font-display leading-none text-[#E9E3D3]" style={titleShadow}>
              <span className="flex items-baseline text-[54px] sm:text-[72px]">
                SURVIV
                <SunO water={0.5} seeThrough />
                RS
              </span>
              <span className="block text-[54px] sm:text-[72px] tracking-[0.16em] mt-1">READY</span>
            </h1>
            <p className="font-label mt-3 text-lg sm:text-xl tracking-[0.32em] text-[#E9E3D3]">
              DRAFT · SCORE · OUTLAST
            </p>
          </div>
        </div>
      </section>

      {/* Sand panel */}
      <section className="relative flex-1">
        <div
          aria-hidden="true"
          className="h-[14px]"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--accent)) 25%, transparent 25%) -7px 0 / 14px 14px, linear-gradient(225deg, hsl(var(--accent)) 25%, transparent 25%) -7px 0 / 14px 14px, hsl(var(--ocean))",
          }}
        />
        <div className="border-t-4 border-accent">
          <div className="container max-w-5xl mx-auto px-5 py-8 sm:py-10 grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-start">
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-[44px] sm:text-[54px] leading-[0.92] text-[#1D3326] dark:text-foreground">
                Draft the cast. Score every episode.
              </h2>
              <p className="text-[17px] leading-relaxed text-muted-foreground max-w-prose">
                A free fantasy league for your group. Draft castaways before the season, score each episode
                during or after it airs, and the standings update for everyone.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button variant="accent" size="lg" className="h-[58px] text-lg" onClick={() => navigate("/auth")}>
                Start a league
              </Button>
              <form onSubmit={joinWithCode} className="flex gap-2">
                <label htmlFor="invite-code" className="sr-only">
                  Invite code
                </label>
                <input
                  id="invite-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="INVITE CODE"
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="h-[54px] min-w-0 flex-1 rounded-[12px] border-2 border-plank bg-card px-4 text-lg font-extrabold tracking-[0.22em] uppercase placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" className="h-[54px] px-6 text-base" disabled={!code.trim()}>
                  Join
                </Button>
              </form>
              <p className="text-sm text-muted-foreground">Have an invite code? Enter it to join your league.</p>
            </div>
          </div>

          <p className="container max-w-5xl mx-auto px-5 pb-6 text-xs text-muted-foreground">
            Palm illustration by Delapouite, game-icons.net (CC BY 3.0).
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;
