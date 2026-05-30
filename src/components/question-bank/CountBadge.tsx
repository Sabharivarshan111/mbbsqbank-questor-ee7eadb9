interface CountBadgeProps {
  count: number;
  tab: "essay" | "short-notes";
}

const CountBadge = ({ count, tab }: CountBadgeProps) => {
  if (!count) return null;
  const isEssay = tab === "essay";
  const label = isEssay ? "ESSAY" : "SHORT";
  const cls = "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${cls}`}
    >
      {count} {label}
    </span>
  );
};

export default CountBadge;
