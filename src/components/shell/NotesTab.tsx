import HandwrittenNotesHub from "@/components/handwritten/HandwrittenNotesHub";

export default function NotesTab() {
  return (
    <div className="space-y-3 pb-4">
      <header className="pt-2">
        <h1 className="text-2xl font-extrabold">Notes</h1>
        <p className="text-sm text-muted-foreground">AI-generated handwritten notes for every topic</p>
      </header>
      <HandwrittenNotesHub />
    </div>
  );
}
