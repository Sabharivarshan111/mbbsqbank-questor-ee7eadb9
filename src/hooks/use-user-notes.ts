import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NoteKind = "text" | "drawing" | "mixed";

export interface UserNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  drawing_data: string | null;
  kind: NoteKind;
  created_at: string;
  updated_at: string;
}

export function useUserNotes(userId: string | null) {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!userId) { setNotes([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("user_notes")
      .select("*")
      .order("updated_at", { ascending: false });
    setNotes((data as UserNote[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchNotes();
    if (!userId) return;
    const channel = supabase
      .channel(`notes:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notes", filter: `user_id=eq.${userId}` },
        () => fetchNotes()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchNotes]);

  const createNote = async (initial?: Partial<UserNote>) => {
    if (!userId) return null;
    const { data } = await supabase
      .from("user_notes")
      .insert({
        user_id: userId,
        title: initial?.title ?? "",
        content: initial?.content ?? "",
        drawing_data: initial?.drawing_data ?? null,
        kind: initial?.kind ?? "text",
      })
      .select()
      .single();
    fetchNotes();
    return data as UserNote | null;
  };

  const updateNote = async (id: string, patch: Partial<Pick<UserNote, "title" | "content" | "drawing_data" | "kind">>) => {
    await supabase.from("user_notes").update(patch).eq("id", id);
    fetchNotes();
  };

  const deleteNote = async (id: string) => {
    await supabase.from("user_notes").delete().eq("id", id);
    fetchNotes();
  };

  return { notes, loading, createNote, updateNote, deleteNote, refetch: fetchNotes };
}
