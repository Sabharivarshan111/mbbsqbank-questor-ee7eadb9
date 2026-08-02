import { AlertTriangle, FolderOpen, MessageCircle } from "lucide-react";

export const WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/KSyFrEnyxf65Q3GOlIMKNQ?s=sh&p=a&ilr=0";
export const THIRD_YEAR_DRIVE_URL =
  "https://drive.google.com/drive/folders/18zCiWPeBQo1OvNKBjh4wWn5U8DgUDubA";

const PlayStoreWarning = () => (
  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex gap-2">
    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
      You must be using the <strong>ORBIT MBBS</strong> app downloaded from the Play Store, on the
      latest version, to join. Search "Orbit MBBS" on the Play Store and install or update it. Older
      or illegitimate versions will not be allowed.
    </p>
  </div>
);

/** Google Drive study materials (3rd year) */
export function StudyMaterialsDriveCard() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <FolderOpen className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm">3rd Year Study Materials</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Curated notes, PDFs and study materials for 3rd year, collected in one Google Drive
            folder.
          </p>
        </div>
      </div>
      <a
        href={THIRD_YEAR_DRIVE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98] transition"
      >
        Tap here to open the study materials
      </a>
    </div>
  );
}

/** WhatsApp community card with the Play Store warning */
export function WhatsAppGroupCard({ note }: { note?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-green-500/15 flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-green-500" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm">WhatsApp group for 3rd year</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            {note ??
              "Join our WhatsApp group for 3rd year study materials, notes and exam updates."}
          </p>
        </div>
      </div>
      <a
        href={WHATSAPP_GROUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98] transition"
      >
        Tap here to join our WhatsApp group
      </a>
      <PlayStoreWarning />
    </div>
  );
}

/** Slim home-screen row */
export function WhatsAppMiniButton() {
  return (
    <a
      href={WHATSAPP_GROUP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/5 px-4 py-3 active:scale-[0.99] transition"
    >
      <span className="h-8 w-8 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
        <MessageCircle className="h-4 w-4 text-green-500" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">Join our WhatsApp community</span>
        <span className="block text-[11px] text-muted-foreground leading-tight">
          3rd year materials, notes & updates
        </span>
      </span>
      <span className="text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">Join</span>
    </a>
  );
}
