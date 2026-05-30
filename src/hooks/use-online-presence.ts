import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CHANNEL = 'room:studying-lobby';

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useOnlinePresence() {
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    const key = randomId();
    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key } },
    });

    const recount = () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      // eslint-disable-next-line no-console
      console.log('[presence] count:', count, state);
      setOnlineCount(Math.max(1, count));
    };

    channel
      .on('presence', { event: 'sync' }, recount)
      .on('presence', { event: 'join' }, recount)
      .on('presence', { event: 'leave' }, recount)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString(), key });
        }
      });

    // Heartbeat: re-track every 30s so mobile-backgrounded clients don't go stale
    const heartbeat = setInterval(() => {
      channel.track({ online_at: new Date().toISOString(), key }).catch(() => {});
    }, 30_000);

    return () => {
      clearInterval(heartbeat);
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
