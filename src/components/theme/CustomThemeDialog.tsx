import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useTheme, DEFAULT_CUSTOM_COLORS, CustomColors } from "./ThemeProvider";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SWATCHES: { key: keyof CustomColors; label: string; hint: string }[] = [
  { key: "background", label: "Background", hint: "Main page color" },
  { key: "foreground", label: "Text", hint: "Main text color" },
  { key: "primary", label: "Accent", hint: "Buttons & highlights" },
  { key: "card", label: "Card", hint: "Cards & panels" },
];

const PRESETS: { name: string; colors: CustomColors }[] = [
  { name: "Ocean", colors: { background: "#0c2340", foreground: "#e8f0f8", primary: "#5cbdb9", card: "#1a4a6e" } },
  { name: "Sunset", colors: { background: "#1a0f1f", foreground: "#fef0e8", primary: "#ff6b35", card: "#2d1b2e" } },
  { name: "Forest", colors: { background: "#0d1f15", foreground: "#e8f5e9", primary: "#4ade80", card: "#1a3326" } },
  { name: "Lavender", colors: { background: "#faf5ff", foreground: "#1e1b4b", primary: "#8b5cf6", card: "#f3e8ff" } },
];

export function CustomThemeDialog({ open, onOpenChange }: Props) {
  const { customColors, setCustomColors, setTheme } = useTheme();
  const [draft, setDraft] = useState<CustomColors>(customColors);

  const apply = () => {
    setCustomColors(draft);
    setTheme("custom");
    onOpenChange(false);
  };

  const reset = () => setDraft(DEFAULT_CUSTOM_COLORS);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-tour="custom-theme-dialog" className="w-[calc(100vw-2rem)] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🎨 Create Your Own Theme</DialogTitle>
          <DialogDescription>
            Pick colors for your perfect look. Changes preview live below.
          </DialogDescription>
        </DialogHeader>

        {/* Color pickers */}
        <div className="grid grid-cols-2 gap-3">
          {SWATCHES.map(({ key, label, hint }) => (
            <Popover key={key}>
              <PopoverTrigger asChild>
                <button
                  className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border hover:border-primary transition-colors text-left"
                >
                  <div
                    className="w-full h-10 rounded-md border border-border shadow-inner"
                    style={{ backgroundColor: draft[key] }}
                  />
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{hint}</div>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <HexColorPicker
                  color={draft[key]}
                  onChange={(c) => setDraft({ ...draft, [key]: c })}
                />
                <div className="mt-2 text-center text-xs font-mono">
                  {draft[key].toUpperCase()}
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>

        {/* Presets */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Quick presets</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => setDraft(p.colors)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border hover:border-primary text-xs transition-colors"
              >
                <span className="flex">
                  {Object.values(p.colors).map((c, i) => (
                    <span
                      key={i}
                      className="w-3 h-3 rounded-sm -ml-0.5 first:ml-0 border border-border"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div
          className="rounded-lg p-4 border space-y-3"
          style={{
            backgroundColor: draft.background,
            color: draft.foreground,
            borderColor: draft.primary + "40",
          }}
        >
          <div className="text-xs opacity-60">Live preview</div>
          <h3 className="text-lg font-bold">Sample Heading</h3>
          <p className="text-sm opacity-80">This is how your text will look across the app.</p>
          <div
            className="rounded-md p-3"
            style={{ backgroundColor: draft.card }}
          >
            <div className="text-sm font-medium">Card component</div>
            <div className="text-xs opacity-70 mt-1">Subject content lives here.</div>
          </div>
          <button
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: draft.primary,
              color: hexToTextColor(draft.primary),
            }}
          >
            Primary Button
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} className="flex-1">
            Reset
          </Button>
          <Button onClick={apply} data-tour="custom-theme-apply" className="flex-1">
            Apply Theme
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function hexToTextColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
}
