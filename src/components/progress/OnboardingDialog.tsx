import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Year } from "@/lib/year-subjects";
import { YEAR_LABELS } from "@/lib/year-subjects";
import { validateDisplayName } from "@/lib/profanity";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  initialName?: string;
  initialYear?: Year;
  onClose?: () => void;
  onSave: (name: string, year: Year) => Promise<void> | void;
  title?: string;
}

const OnboardingDialog = ({ open, initialName = "", initialYear = "first", onClose, onSave, title = "Welcome, future doctor 🩺" }: Props) => {
  const [name, setName] = useState(initialName);
  const [year, setYear] = useState<Year>(initialYear);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    const check = validateDisplayName(name);
    if (!check.ok) {
      setError(check.reason ?? "Invalid name.");
      toast({ title: "Choose a different name", description: check.reason, variant: "destructive" });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(name.trim(), year);
      onClose?.();
    } catch (e: any) {
      setError(e?.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Track your progress, build streaks, and compete on the leaderboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="dr-name">Name</Label>
            <Input
              id="dr-name"
              placeholder="Dr. ___"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Select value={year} onValueChange={(v) => setYear(v as Year)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(YEAR_LABELS) as Year[]).map((y) => (
                  <SelectItem key={y} value={y}>{YEAR_LABELS[y]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;
