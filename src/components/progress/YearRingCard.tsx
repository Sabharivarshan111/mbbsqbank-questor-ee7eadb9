import { useEffect, useState } from "react";
import { useCountUp } from "@/hooks/use-count-up";

interface Props {
  completed: number;
  total: number;
}

const YearRingCard = ({ completed, total }: Props) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;
  const radius = 56;
  const circ = 2 * Math.PI * radius;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const dash = mounted ? (pct / 100) * circ : 0;

  const pctAnim = useCountUp(pct);
  const completedAnim = useCountUp(completed);
  const remainingAnim = useCountUp(remaining);
  const totalAnim = useCountUp(total);

  return (
    <div className="rounded-2xl bg-card border p-5 flex flex-col items-center animate-fade-in">
      <p className="text-xs tracking-widest text-muted-foreground mb-3">YOUR YEAR</p>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle cx="70" cy="70" r={radius} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
          <circle
            cx="70" cy="70" r={radius}
            stroke="url(#ringGrad)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold bg-gradient-to-r from-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
            {pctAnim}%
          </span>
          <span className="text-xs text-muted-foreground">done</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full mt-4 text-center">
        <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <p className="text-xl font-bold text-emerald-500">{completedAnim}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Completed</p>
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <p className="text-xl font-bold text-orange-500">{remainingAnim}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</p>
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
          <p className="text-xl font-bold text-fuchsia-500">{totalAnim}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
        </div>
      </div>
    </div>
  );
};

export default YearRingCard;
