import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

export function AdminSettings() {
  const [donateUrl, setDonateUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'donate_url')
        .maybeSingle();
      if (data) setDonateUrl(data.value || '');
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .update({ value: donateUrl.trim(), updated_at: new Date().toISOString() })
      .eq('key', 'donate_url');

    if (error) {
      toast.error('Failed to save setting');
    } else {
      toast.success('Donate URL saved!');
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          App Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-lg">
          <Label htmlFor="donate-url">Donate / Buy Me a Coffee URL</Label>
          <Input
            id="donate-url"
            placeholder="https://buymeacoffee.com/yourname"
            value={donateUrl}
            onChange={(e) => setDonateUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to hide the donate button throughout the app.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
