import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_MS = 15_000;
const ACTIVE_WINDOW_SECONDS = 45;

function getDeviceId() {
  try {
    const KEY = 'study_presence_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function useOnlinePresence() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    const deviceId = getDeviceId();
    let cancelled = false;

    const ping = async () => {
      try {
        await supabase
          .from('study_presence')
          .upsert({ device_id: deviceId, last_seen: new Date().toISOString() });
      } catch {
        /* ignore */
      }
    };

    const recount = async () => {
      try {
        const since = new Date(Date.now() - ACTIVE_WINDOW_SECONDS * 1000).toISOString();
        const { count, error } = await supabase
          .from('study_presence')
          .select('device_id', { count: 'exact', head: true })
          .gte('last_seen', since);
        if (error) throw error;
        if (!cancelled) setOnlineCount(count ?? null);
      } catch {
        if (!cancelled) setOnlineCount(null);
      }
    };

    // initial
    ping().then(recount);

    const heartbeat = setInterval(() => {
      ping().then(recount);
    }, HEARTBEAT_MS);

    const cleanup = async () => {
      try {
        await supabase.from('study_presence').delete().eq('device_id', deviceId);
      } catch {
        /* ignore */
      }
    };

    const onBeforeUnload = () => {
      // best-effort fire-and-forget
      void cleanup();
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', onBeforeUnload);
      void cleanup();
    };
  }, []);

  return { onlineCount };
}
