import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getThemeGradient } from "@/lib/theme-gradients";

export interface CelebrationEvent {
  id: number;
  kind: "level" | "streak" | "badge";
  value: number;
  label?: string;
  emoji?: string;
}

interface Props {
  event: CelebrationEvent | null;
  onClose: () => void;
}

const CelebrationOverlay = ({ event, onClose }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const grad = getThemeGradient(theme);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!event) return;
    setOpen(true);
    fireConfetti();
    const t = setTimeout(() => {
      setOpen(false);
      setTimeout(onClose, 200);
    }, 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  function fireConfetti() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    const colors = ["#ec4899", "#f97316", "#a855f7", "#22d3ee", "#facc15", "#34d399"];
    const N = 140;
    const parts = Array.from({ length: N }).map(() => ({
      x: W / 2 + (Math.random() - 0.5) * 80,
      y: H / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      g: 0.35,
      size: Math.random() * 6 + 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
    }));
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 2500);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.4);
        ctx.restore();
      }
      if (elapsed < 2500) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }

  const title =
    event?.kind === "level" ? `Level ${event.value} reached!` :
    event?.kind === "streak" ? `${event.value}-day streak unlocked!` :
    event?.kind === "badge" ? `${event.emoji ?? "🏅"} ${event.label ?? "Badge"} unlocked!` :
    "";

  const subtitle =
    event?.kind === "level" ? "Every answer compounds. Keep climbing." :
    event?.kind === "streak" ? "Consistency is the real flex." :
    event?.kind === "badge" ? `You earned ${event.value} ${event.label?.includes("Flame") ? "days" : "XP"}.` :
    "";

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[100]"
        style={{ display: event ? "block" : "none" }}
      />
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setTimeout(onClose, 150); } }}>
        <DialogContent className="max-w-xs text-center border-0 overflow-hidden p-0">
          <div className={`${grad.bg} p-[2px] rounded-lg`}>
            <div className="bg-card rounded-[6px] p-6 space-y-3">
              <div className="text-5xl animate-scale-in">
                {event?.kind === "badge" ? event.emoji : event?.kind === "streak" ? "🔥" : "⭐"}
              </div>
              <h2 className={`text-xl font-bold bg-clip-text text-transparent ${grad.text}`}>
                {title}
              </h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CelebrationOverlay;
