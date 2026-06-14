import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile } from "@/hooks/use-profile";
import { YEAR_LABELS, type Year } from "@/lib/year-subjects";

interface Props {
  onDone: () => void;
}

const WalkthroughProfileSetup = ({ onDone }: Props) => {
  const { local, saveProfile } = useProfile();
  const [name, setName] = useState(local?.display_name ?? "");
  const [year, setYear] = useState<Year>(local?.year ?? "first");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveProfile({ display_name: name.trim(), year });
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-1">
      <div className="space-y-1.5">
        <Label htmlFor="wt-name" className="text-xs">Your name</Label>
        <Input
          id="wt-name"
          placeholder="Dr. ___"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Year</Label>
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
        {saving ? "Saving…" : local ? "Update & continue" : "Save & continue"}
      </Button>
    </div>
  );
};

export default WalkthroughProfileSetup;
