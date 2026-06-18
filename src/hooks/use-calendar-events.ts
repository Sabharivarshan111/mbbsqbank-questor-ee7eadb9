import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface CalendarEvent {
  id: string;
  user_id: string;
  event_date: string;
  title: string;
  important: boolean;
  created_at: string;
  updated_at: string;
}

export function useCalendarEvents(userId: string | null) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!userId) { setEvents([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });
    setEvents((data as CalendarEvent[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchEvents();
    if (!userId) return;
    const channel = supabase
      .channel(`calendar:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events", filter: `user_id=eq.${userId}` },
        () => fetchEvents()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchEvents]);

  const addEvent = async (date: Date, title: string, important = false) => {
    if (!userId) return;
    await supabase.from("calendar_events").insert({
      user_id: userId,
      event_date: format(date, "yyyy-MM-dd"),
      title,
      important,
    });
    fetchEvents();
  };

  const updateEvent = async (id: string, patch: Partial<Pick<CalendarEvent, "title" | "important">>) => {
    await supabase.from("calendar_events").update(patch).eq("id", id);
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("calendar_events").delete().eq("id", id);
    fetchEvents();
  };

  return { events, loading, addEvent, updateEvent, deleteEvent, refetch: fetchEvents };
}
