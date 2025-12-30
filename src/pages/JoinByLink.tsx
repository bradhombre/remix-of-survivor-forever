import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { TeamSelectionDialog } from '@/components/TeamSelectionDialog';

export default function JoinByLink() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [joinedLeagueId, setJoinedLeagueId] = useState<string | null>(null);

  useEffect(() => {
    const processJoin = async () => {
      if (!code) {
        toast.error('Invalid invite link');
        navigate('/leagues');
        return;
      }

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to auth with return URL
        navigate(`/auth?returnTo=/join/${code}`);
        return;
      }

      // User is logged in, attempt to join
      try {
        const { data, error } = await supabase.rpc('join_league', {
          invite_code_input: code.toUpperCase()
        });

        if (error) {
          if (error.message.includes('Already a member')) {
            toast.info('You are already a member of this league');
            // Find the league and redirect to it
            const { data: leagues } = await supabase
              .from('leagues')
              .select('id')
              .eq('invite_code', code.toUpperCase())
              .single();
            
            if (leagues?.id) {
              navigate(`/league/${leagues.id}`);
            } else {
              navigate('/leagues');
            }
          } else if (error.message.includes('Invalid invite code')) {
            toast.error('Invalid invite code');
            navigate('/leagues');
          } else {
            toast.error(error.message);
            navigate('/leagues');
          }
        } else if (data) {
          // Successfully joined - check if there are available teams to claim
          const leagueId = data.league_id;
          setJoinedLeagueId(leagueId);
          
          // Check if user already has a team or if there are available teams
          const { data: userTeam } = await supabase
            .from('league_teams')
            .select('id')
            .eq('league_id', leagueId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (userTeam) {
            // User already has a team
            toast.success('Successfully joined the league!');
            navigate(`/league/${leagueId}`);
          } else {
            // Check for available teams
            const { data: availableTeams } = await supabase
              .rpc('get_available_teams', { league_uuid: leagueId });

            if (availableTeams && availableTeams.length > 0) {
              // Show team selection dialog
              setShowTeamSelection(true);
              setIsProcessing(false);
            } else {
              // No teams available, just redirect
              toast.success('Successfully joined the league!');
              navigate(`/league/${leagueId}`);
            }
          }
        }
      } catch (err) {
        toast.error('Failed to join league');
        navigate('/leagues');
      }
    };

    processJoin();
  }, [code, navigate]);

  const handleTeamSelected = () => {
    setShowTeamSelection(false);
    toast.success('Successfully joined the league!');
    if (joinedLeagueId) {
      navigate(`/league/${joinedLeagueId}`);
    } else {
      navigate('/leagues');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {isProcessing ? (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Joining league...</p>
        </div>
      ) : (
        <>
          {joinedLeagueId && (
            <TeamSelectionDialog
              open={showTeamSelection}
              onOpenChange={(open) => {
                if (!open) {
                  // If they close without selecting, still redirect
                  navigate(`/league/${joinedLeagueId}`);
                }
              }}
              leagueId={joinedLeagueId}
              onTeamSelected={handleTeamSelected}
            />
          )}
          <div className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Select your team to continue...</p>
          </div>
        </>
      )}
    </div>
  );
}
