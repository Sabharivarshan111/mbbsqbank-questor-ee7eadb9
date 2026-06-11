import { memo } from "react";
interface CountBadgeProps {
  count: number;
  tab: "essay" | "short-notes";
  done?: number;
}

const CountBadge = memo(({ count, tab, done }: CountBadgeProps) => {
  if (!count) return null;
  const label = tab === "essay" ? "ESSAY" : "SHORT";
  const cls = "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  const text = typeof done === "number" ? `${done}/${count}` : `${count}`;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${cls}`}
    >
      {text} {label}
    </span>
  );
});

export default CountBadge;
