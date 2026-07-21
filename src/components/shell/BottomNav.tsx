import { Home, FileText, Timer, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type ShellTab = "home" | "notes" | "timer" | "askai" | "progress" | "browse";

const ITEMS: { key: Exclude<ShellTab, "browse">; label: string; icon: any; tour: string }[] = [
  { key: "home", label: "Home", icon: Home, tour: "nav-home" },
  { key: "notes", label: "Notes", icon: FileText, tour: "nav-notes" },
  { key: "timer", label: "Timer", icon: Timer, tour: "nav-timer" },
  { key: "askai", label: "Ask AI", icon: Sparkles, tour: "nav-askai" },
  { key: "progress", label: "My Progress", icon: User, tour: "nav-progress" },
];

export default function BottomNav({
  active,
  onChange,
}: {
  active: ShellTab;
  onChange: (t: ShellTab) => void;
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto max-w-2xl px-2 py-1.5 grid grid-cols-5 items-end gap-1 relative">
        {ITEMS.map((it) => {
          const isActive = active === it.key;
          const isCenter = it.key === "timer";
          const Icon = it.icon;
          if (isCenter) {
            return (
              <button
                key={it.key}
                onClick={() => onChange("timer")}
                data-tour={it.tour}
                className="relative -mt-6 mx-auto flex flex-col items-center justify-center"
                aria-label="Timer"
              >
                <span
                  className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-transform",
                    "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
                    "ring-4 ring-background",
                    isActive && "scale-105"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-[10px] mt-1 text-muted-foreground">{" "}</span>
              </button>
            );
          }
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              data-tour={it.tour}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={it.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]")} />
              <span className="text-[10px] font-medium">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
