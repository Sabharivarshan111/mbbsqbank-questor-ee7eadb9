import { Capacitor } from "@capacitor/core";

const ENABLED_KEY = "orbit.notif.enabled";

export const NOTIF_IDS = {
  pomodoro: 1,
  dailyTarget: 2,
  streakRisk: 3,
  calendarBase: 1000,
};

export function isNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const v = window.localStorage.getItem(ENABLED_KEY);
  return v === null ? true : v === "true";
}

export function setNotificationsEnabled(on: boolean) {
  window.localStorage.setItem(ENABLED_KEY, on ? "true" : "false");
  if (!on) cancelAll().catch(() => {});
}

function isNative() {
  return Capacitor.isNativePlatform();
}

async function getPlugin() {
  if (!isNative()) return null;
  try {
    const mod = await import("@capacitor/local-notifications");
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

export async function ensurePermission(): Promise<boolean> {
  const LN = await getPlugin();
  if (!LN) return false;
  try {
    const cur = await LN.checkPermissions();
    if (cur.display === "granted") return true;
    const req = await LN.requestPermissions();
    return req.display === "granted";
  } catch {
    return false;
  }
}

export async function scheduleOne(opts: {
  id: number;
  title: string;
  body: string;
  at: Date;
}): Promise<void> {
  if (!isNotificationsEnabled()) return;
  if (opts.at.getTime() <= Date.now() + 1000) return;
  const LN = await getPlugin();
  if (!LN) return;
  try {
    await LN.schedule({
      notifications: [
        {
          id: opts.id,
          title: opts.title,
          body: opts.body,
          schedule: { at: opts.at, allowWhileIdle: true },
          smallIcon: "ic_stat_icon_config_sample",
        },
      ],
    });
  } catch {
    /* ignore */
  }
}

export async function cancel(ids: number[]): Promise<void> {
  const LN = await getPlugin();
  if (!LN || ids.length === 0) return;
  try {
    await LN.cancel({ notifications: ids.map((id) => ({ id })) });
  } catch {
    /* ignore */
  }
}

export async function cancelAll(): Promise<void> {
  const LN = await getPlugin();
  if (!LN) return;
  try {
    const pending = await LN.getPending();
    const ids = (pending.notifications || []).map((n) => Number(n.id)).filter((n) => !isNaN(n));
    if (ids.length) await LN.cancel({ notifications: ids.map((id) => ({ id })) });
  } catch {
    /* ignore */
  }
}

export function calendarNotifId(eventId: string): number {
  let h = 0;
  for (let i = 0; i < eventId.length; i++) {
    h = (h * 31 + eventId.charCodeAt(i)) >>> 0;
  }
  return NOTIF_IDS.calendarBase + (h % 100000);
}
