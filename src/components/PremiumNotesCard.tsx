import { BookOpen } from "lucide-react";
import NotesPurchaseCard from "@/components/premium/NotesPurchaseCard";

export { PREMIUM_NOTES_DRIVE_URL } from "@/hooks/use-notes-purchase";

/** Third-year pill: FM + SPM combined revision notes (₹50). */
export default function PremiumNotesCard() {
  return (
    <NotesPurchaseCard
      copy={{
        plan: "notes_fmspm",
        priceLabel: "₹50",
        icon: BookOpen,
        cardTitle: "All of today's FM exam questions came from our revision notes 🎯",
        cardBody: (
          <>
            Now get it for <strong>SPM</strong> and rock your SPM exam too — FM 160 pages · SPM 130
            pages, revise the whole thing in one night. All important questions with answers,
            mnemonics &amp; easy flowcharts, plus{" "}
            <strong>MCQs, previous year MCQs &amp; predicted papers</strong>.
          </>
        ),
        badges: [
          { text: "Today's FM paper matched", tone: "amber" },
          { text: "+ Ad-free 1 month free", tone: "emerald" },
        ],
        dialogTitle: "FM + SPM revision notes — ₹50",
        dialogBody: (
          <>
            One-time payment · lifetime access to the combined Forensic Medicine + SPM revision
            notes folder on Google Drive — including MCQs, previous year MCQs and predicted papers.
            Bundled with <strong>1 month ad-free</strong> at no extra cost.
          </>
        ),
        ownedTitle: "Congratulations — FM + SPM notes unlocked! 🎉",
        ownedBody: (
          <>
            You also unlocked <strong>ad-free for 1 month</strong>, plus MCQs, previous year MCQs
            &amp; predicted papers. Tap to open your Google Drive folder.
          </>
        ),
        payLabel: "Pay ₹50 & unlock notes",
      }}
    />
  );
}
