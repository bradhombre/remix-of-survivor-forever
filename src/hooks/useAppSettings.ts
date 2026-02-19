import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAppSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((row: any) => { map[row.key] = row.value; });
        setSettings(map);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { settings, loading };
}
