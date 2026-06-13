interface Props {
  completed: number;
  total: number;
}

const YearRingCard = ({ completed, total }: Props) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div className="rounded-2xl bg-card border p-5 flex flex-col items-center">
      <p className="text-xs tracking-widest text-muted-foreground mb-3">YOUR YEAR</p>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle cx="70" cy="70" r={radius} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
          <circle
            cx="70" cy="70" r={radius}
            stroke="hsl(var(--primary))"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{pct}%</span>
          <span className="text-xs text-muted-foreground">done</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full mt-4 text-center">
        <div>
          <p className="text-xl font-bold text-emerald-500">{completed}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Completed</p>
        </div>
        <div>
          <p className="text-xl font-bold text-orange-500">{remaining}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</p>
        </div>
        <div>
          <p className="text-xl font-bold text-fuchsia-500">{total}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
        </div>
      </div>
    </div>
  );
};

export default YearRingCard;
