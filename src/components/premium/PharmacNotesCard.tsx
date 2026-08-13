import { Pill } from "lucide-react";
import NotesPurchaseCard from "@/components/premium/NotesPurchaseCard";

/** Second-year pill: full-subject Pharmacology notes (₹100). */
export default function PharmacNotesCard() {
  return (
    <NotesPurchaseCard
      copy={{
        plan: "notes_pharmac",
        priceLabel: "₹50",
        icon: Pill,
        cardTitle: "Pharmacology full-subject notes — pass guarantee 💊",
        cardBody: (
          <>
            Whole subject covered chapter-wise with all the important questions &amp; answers,
            prepared from <strong>K.D. Tripathi</strong> and <strong>Tara Shanbhag</strong> — under
            150 pages, all chapters. Don't miss this chance — you can pass Pharmacology using these
            notes.
          </>
        ),
        badges: [
          { text: "Pass mark guarantee", tone: "amber" },
          { text: "+ Ad-free 1 month free", tone: "emerald" },
        ],
        dialogTitle: "Pharmacology notes — ₹50",
        dialogBody: (
          <>
            One-time payment · lifetime access to the full-subject Pharmacology notes folder on
            Google Drive. Chapter-wise important questions with answers, made from K.D. Tripathi +
            Tara Shanbhag, under 150 pages. Bundled with <strong>1 month ad-free</strong> free.
          </>
        ),
        ownedTitle: "Congratulations — Pharmacology notes unlocked! 🎉",
        ownedBody: (
          <>
            You also unlocked <strong>ad-free for 1 month</strong>. Tap to open your Google Drive
            folder with all chapters.
          </>
        ),
        payLabel: "Pay ₹100 & unlock notes",
        showRestore: false,
      }}
    />
  );
}
