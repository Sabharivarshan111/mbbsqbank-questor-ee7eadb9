import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CHANNEL = 'presence:studying';

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useOnlinePresence() {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const key = randomId();
    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      try {
        channel.untrack();
      } catch {
        /* ignore */
      }
      supabase.removeChannel(channel);
    };
  }, []);

  return { onlineCount };
}
