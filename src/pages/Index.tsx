import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DonateButton } from "@/components/DonateButton";
import { Trophy, Zap, Users, Settings } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/leagues');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Logged-out landing page
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-2xl text-center space-y-8">
        {/* Hero */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <Trophy className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
            Survivor Fantasy Leagues
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Draft contestants, score points, and compete with friends to prove who has the best Survivor instincts.
          </p>
        </div>

        {/* CTA */}
        <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
          Get Started
        </Button>

        {/* Features */}
        <div className="grid gap-6 sm:grid-cols-3 pt-8 border-t border-border">
          <div className="flex flex-col items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            <h3 className="font-semibold">Custom Scoring</h3>
            <p className="text-sm text-muted-foreground">
              Set your own point values for every action
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            <h3 className="font-semibold">Real-Time Sync</h3>
            <p className="text-sm text-muted-foreground">
              Scores update live as you watch
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            <h3 className="font-semibold">Invite Friends</h3>
            <p className="text-sm text-muted-foreground">
              Share a code or link to grow your league
            </p>
          </div>
        </div>

        {/* Footer with donate */}
        <div className="pt-6">
          <DonateButton />
        </div>
      </div>
    </div>
  );
};

export default Index;
