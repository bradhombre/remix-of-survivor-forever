import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';

const inviteCodeSchema = z.object({
  code: z.string().trim().length(6, 'Invite code must be 6 characters'),
});

interface JoinLeagueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (leagueId: string) => void;
}

export function JoinLeagueDialog({ open, onOpenChange, onSuccess }: JoinLeagueDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      inviteCodeSchema.parse({ code });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('join_league', { invite_code_input: code.trim().toUpperCase() });

    if (error) {
      if (error.message.includes('Invalid invite code')) {
        toast.error('Invalid invite code. Please check and try again.');
      } else if (error.message.includes('Already a member')) {
        toast.error('You are already a member of this league.');
      } else if (error.message.includes('League is full')) {
        toast.error('This league is full - no available slots.');
      } else {
        toast.error(error.message || 'Failed to join league');
      }
      setLoading(false);
    } else if (data?.league_id) {
      // Successfully joined - auto-assigned to team slot
      toast.success('Successfully joined the league!');
      setCode('');
      onOpenChange(false);
      onSuccess(data.league_id);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a League</DialogTitle>
          <DialogDescription>
            Enter the 6-character invite code shared by the league admin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="e.g., ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="font-mono text-center text-lg tracking-widest"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Joining...' : 'Join League'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
