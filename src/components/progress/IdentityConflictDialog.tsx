import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { YEAR_LABELS, type Year } from "@/lib/year-subjects";

export interface IdentitySnapshot {
  display_name: string;
  year: Year;
}

interface Props {
  open: boolean;
  cloud: IdentitySnapshot | null;
  local: IdentitySnapshot | null;
  onChoose: (which: "cloud" | "local") => void;
}

export default function IdentityConflictDialog({ open, cloud, local, onChoose }: Props) {
  if (!cloud || !local) return null;
  return (
    <AlertDialog open={open}>
      <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Which profile should we keep?</AlertDialogTitle>
          <AlertDialogDescription>
            You signed in with an account that already has a profile. This device
            has a different name or year. Pick which one to keep — your question
            ticks and XP will merge either way.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => onChoose("cloud")}
            className="rounded-xl border bg-card p-4 text-left hover:border-primary transition"
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              From your account
            </div>
            <div className="mt-1 font-semibold">Dr. {cloud.display_name}</div>
            <div className="text-xs text-muted-foreground">{YEAR_LABELS[cloud.year]}</div>
          </button>
          <button
            onClick={() => onChoose("local")}
            className="rounded-xl border bg-card p-4 text-left hover:border-primary transition"
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              On this device
            </div>
            <div className="mt-1 font-semibold">Dr. {local.display_name}</div>
            <div className="text-xs text-muted-foreground">{YEAR_LABELS[local.year]}</div>
          </button>
        </div>

        <AlertDialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onChoose("cloud")}>
            Keep account
          </Button>
          <Button onClick={() => onChoose("local")}>Use this device</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
