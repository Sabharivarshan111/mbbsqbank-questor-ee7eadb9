import { useState } from "react";
import { Plus, Trash2, Pencil, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserNotes, type UserNote } from "@/hooks/use-user-notes";
import DrawingCanvas from "./DrawingCanvas";

interface Props { userId: string | null; }

const ProgressNotesTab = ({ userId }: Props) => {
  const { notes, createNote, updateNote, deleteNote } = useUserNotes(userId);
  const [editing, setEditing] = useState<UserNote | null>(null);
  const [drawingFor, setDrawingFor] = useState<UserNote | null>(null);

  if (!userId) {
    return (
      <div className="rounded-2xl bg-card border p-6 text-center text-sm text-muted-foreground">
        Sign in with Google or email to use cloud-synced notes.
      </div>
    );
  }

  const handleNew = async () => {
    const note = await createNote({ title: "Untitled", content: "" });
    if (note) setEditing(note);
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleNew} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> New note
      </Button>

      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border bg-card p-3 space-y-1">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{n.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{n.content || (n.drawing_data ? "(drawing)" : "Empty")}</div>
              </div>
              {n.drawing_data && <ImageIcon className="h-4 w-4 text-muted-foreground mt-1" />}
              <button onClick={() => setEditing(n)} className="text-muted-foreground hover:text-foreground" aria-label="edit">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => deleteNote(n.id)} className="text-muted-foreground hover:text-destructive" aria-label="delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {n.drawing_data && (
              <img src={n.drawing_data} alt="" className="w-full max-h-40 object-contain rounded border bg-white" />
            )}
          </li>
        ))}
        {notes.length === 0 && (
          <li className="text-xs text-muted-foreground italic text-center py-6">No notes yet. Tap "New note" to start.</li>
        )}
      </ul>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit note</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Title"
              />
              <Textarea
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                placeholder="Type your note…"
                rows={6}
              />
              {editing.drawing_data && (
                <img src={editing.drawing_data} alt="" className="w-full max-h-48 object-contain rounded border bg-white" />
              )}
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setDrawingFor(editing)}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {editing.drawing_data ? "Edit drawing" : "Add drawing"}
                </Button>
                <Button
                  onClick={async () => {
                    const kind = editing.drawing_data
                      ? (editing.content ? "mixed" : "drawing")
                      : "text";
                    await updateNote(editing.id, {
                      title: editing.title,
                      content: editing.content,
                      drawing_data: editing.drawing_data,
                      kind,
                    });
                    setEditing(null);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!drawingFor} onOpenChange={(o) => !o && setDrawingFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Drawing</DialogTitle></DialogHeader>
          {drawingFor && (
            <DrawingCanvas
              initialDataUrl={drawingFor.drawing_data}
              onCancel={() => setDrawingFor(null)}
              onSave={(dataUrl) => {
                if (editing && drawingFor.id === editing.id) {
                  setEditing({ ...editing, drawing_data: dataUrl });
                }
                setDrawingFor(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgressNotesTab;
