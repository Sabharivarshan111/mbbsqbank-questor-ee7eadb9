import HandwrittenNotesHub from "@/components/handwritten/HandwrittenNotesHub";
import { StudyMaterialsDriveCard, WhatsAppGroupCard } from "@/components/community/CommunityCards";
import { useProfile } from "@/hooks/use-profile";

export default function NotesTab() {
  const { local } = useProfile();
  const isThirdYear = local?.year === "third";

  return (
    <div className="space-y-3 pb-4">
      <header className="pt-2">
        <h1 className="text-2xl font-extrabold">Notes</h1>
        <p className="text-sm text-muted-foreground">AI-generated handwritten notes for every topic</p>
      </header>
      <HandwrittenNotesHub />

      {isThirdYear && (
        <div className="space-y-3 pt-2">
          <StudyMaterialsDriveCard />
          <WhatsAppGroupCard />
        </div>
      )}
    </div>
  );
}
