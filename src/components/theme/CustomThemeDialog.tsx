import { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

const SWATCHES: { key: keyof CustomColors; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
  { key: "primary", label: "Accent" },
  { key: "card", label: "Card" },
];

const PRESETS: { name: string; colors: CustomColors }[] = [
  { name: "Ocean", colors: { background: "#0c2340", foreground: "#e8f0f8", primary: "#5cbdb9", card: "#1a4a6e" } },
  { name: "Sunset", colors: { background: "#1a0f1f", foreground: "#fef0e8", primary: "#ff6b35", card: "#2d1b2e" } },
  { name: "Forest", colors: { background: "#0d1f15", foreground: "#e8f5e9", primary: "#4ade80", card: "#1a3326" } },
  { name: "Lavender", colors: { background: "#faf5ff", foreground: "#1e1b4b", primary: "#8b5cf6", card: "#f3e8ff" } },
];

export function CustomThemeDialog({ open, onOpenChange }: Props) {
  const { theme, customColors, setCustomColors, setTheme } = useTheme();
  const [draft, setDraft] = useState<CustomColors>(customColors);

  const apply = () => {
    setCustomColors(draft);
    setTheme("custom");
    onOpenChange(false);
  };

  const reset = () => setDraft(DEFAULT_CUSTOM_COLORS);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(open ? "orbit:custom-theme-opened" : "orbit:custom-theme-closed"),
    );
  }, [open]);

  const applyBtnClass =
    theme === "liquid-glass"
      ? "flex-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90 border-0"
      : "flex-1";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-tour="custom-theme-dialog"
        className="max-w-md max-h-[90dvh] overflow-y-auto w-[calc(100vw-2rem)] p-4 gap-3"
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base">🎨 Create Your Own Theme</DialogTitle>
          <DialogDescription className="text-xs">
            Pick colors. Preview updates live.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {SWATCHES.map(({ key, label }) => (
            <Popover key={key}>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-start gap-1.5 p-2 rounded-lg border border-border hover:border-primary transition-colors text-left">
                  <div
                    className="w-full h-6 rounded-md border border-border shadow-inner"
                    style={{ backgroundColor: draft[key] }}
                  />
                  <div className="text-xs font-medium">{label}</div>
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

        <div>
          <div className="text-[11px] font-medium text-muted-foreground mb-1.5">Quick presets</div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => setDraft(p.colors)}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:border-primary text-[11px] transition-colors"
              >
                <span className="flex">
                  {Object.values(p.colors).map((c, i) => (
                    <span
                      key={i}
                      className="w-2.5 h-2.5 rounded-sm -ml-0.5 first:ml-0 border border-border"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div
          className="rounded-lg p-3 border flex items-center justify-between gap-3"
          style={{
            backgroundColor: draft.background,
            color: draft.foreground,
            borderColor: draft.primary + "40",
          }}
        >
          <div className="rounded-md px-3 py-2 text-xs flex-1" style={{ backgroundColor: draft.card }}>
            Live preview
          </div>
          <button
            className="px-3 py-2 rounded-md text-xs font-medium shrink-0"
            style={{
              backgroundColor: draft.primary,
              color: hexToTextColor(draft.primary),
            }}
          >
            Button
          </button>
        </div>

        <div className="sticky bottom-0 -mx-4 px-4 pt-2 pb-1 bg-background flex gap-2 border-t">
          <Button variant="outline" onClick={reset} className="flex-1">
            Reset
          </Button>
          <Button onClick={apply} data-tour="custom-theme-apply" className={applyBtnClass}>
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
