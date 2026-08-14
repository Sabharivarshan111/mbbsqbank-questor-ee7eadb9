import { Trophy, ChevronDown } from "lucide-react";
import { useState } from "react";

/** ---------- Types ---------- */
export interface NotesContent {
  highYieldTip?: string;
  pyqYears?: string[];
  sections: Section[];
}

interface BaseSection {
  type: string;
  title: string;
  icon?: string;
  pyqYears?: string[];
  payload: any;
}
export type Section = BaseSection;

/** ---------- Small primitives ---------- */
const PyqBadge = ({ years }: { years?: string[] }) => {
  if (!years || years.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[9px] font-extrabold tracking-widest px-2 py-1 rounded bg-amber-200 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200">
        {years.length}\u00d7 ASKED
      </span>
      {years.map((y) => (
        <span key={y} className="text-[9px] font-bold tracking-wider px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 uppercase">
          {y}
        </span>
      ))}
    </div>
  );
};

const StarsChip = ({ count }: { count: number }) => {
  if (!count) return null;
  const stars = "\u2605".repeat(Math.min(3, count));
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white">
      {stars} asked {count}\u00d7
    </span>
  );
};

const TagChip = ({ tag }: { tag?: string }) => {
  if (!tag) return null;
  const styles: Record<string, string> = {
    CLASSIC: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    PATHOGNOMONIC: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    COMMON: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  };
  return (
    <span className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded ${styles[tag] ?? "bg-muted text-muted-foreground"}`}>
      {tag}
    </span>
  );
};

const SectionShell = ({
  icon, title, defaultOpen = true, children,
}: { icon?: string; title: string; defaultOpen?: boolean; children: React.ReactNode }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xl flex-shrink-0">
          {icon ?? "📌"}
        </div>
        <h3 className="flex-1 text-lg font-bold">{title}</h3>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t p-4 space-y-3">{children}</div>}
    </div>
  );
};

/** ---------- Section renderers ---------- */
const DefinitionSection = ({ text }: { text: string }) => (
  <div className="border-l-[3px] border-rose-500 bg-rose-50 dark:bg-rose-950/25 px-3.5 py-3 rounded-r-lg">
    <p className="text-[9px] font-extrabold tracking-widest text-rose-600 dark:text-rose-300 mb-1.5">
      DEFINITION \u2014 VERBATIM, LEARN BOTH
    </p>
    <p className="text-[13px] leading-relaxed text-rose-900 dark:text-rose-100 font-medium">{text}</p>
  </div>
);

const TextSection = ({ paragraph }: { paragraph: string }) => (
  <p className="text-sm leading-relaxed">{paragraph}</p>
);

const BulletsSection = ({ items }: { items: { label: string; description: string }[] }) => (
  <div className="divide-y">
    {items.map((it, i) => (
      <div key={i} className="py-3 first:pt-0 last:pb-0">
        <div className="flex items-start gap-2">
          <span className="mt-1.5 h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-orange-700 dark:text-orange-400">{it.label}</p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{it.description}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const StepsSection = ({ items }: { items: { title: string; description: string; keyTrigger?: string }[] }) => (
  <div className="space-y-3">
    {items.map((it, i) => (
      <div key={i} className="flex gap-3">
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
            {i + 1}
          </div>
          {i < items.length - 1 && <div className="w-0.5 flex-1 bg-border my-1" />}
        </div>
        <div className="flex-1 bg-muted/40 p-3 rounded-lg mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{it.title}</p>
          <p className="text-sm leading-relaxed">{it.description}</p>
          {it.keyTrigger && (
            <div className="mt-2 inline-block text-xs px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              Key trigger: {it.keyTrigger}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

const MorphologySection = ({ subtitle, items }: { subtitle?: string; items: { title: string; tag?: string; details: string[] }[] }) => (
  <div className="space-y-4">
    {subtitle && (
      <p className="text-sm font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">
        🔬 {subtitle}
      </p>
    )}
    {items.map((it, i) => (
      <div key={i}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <p className="font-bold">{it.title}</p>
          </div>
          <TagChip tag={it.tag} />
        </div>
        <ul className="ml-4 border-l-2 border-muted pl-3 space-y-1">
          {it.details.map((d, j) => (
            <li key={j} className="text-sm text-muted-foreground before:content-['—'] before:mr-2 before:text-muted">
              {d}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

const ComparisonSection = ({ left, right, rows }: { left: string; right: string; rows: { label: string; left: string; right: string }[] }) => (
  <div>
    <div className="grid grid-cols-[1fr_auto_1fr] gap-0 rounded-lg overflow-hidden border mb-4">
      <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 p-3 text-center font-bold text-sm">{left}</div>
      <div className="bg-rose-600 text-white p-3 flex items-center justify-center text-xs font-bold">VS</div>
      <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 p-3 text-center font-bold text-sm">{right}</div>
    </div>
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i}>
          <p className="text-center text-[11px] font-bold tracking-widest text-muted-foreground mb-2 uppercase">{r.label}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="border rounded-lg p-3 text-sm text-center">{r.left}</div>
            <div className="border rounded-lg p-3 text-sm text-center">{r.right}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const IMNCI_ROW_STYLES: Record<string, string> = {
  PINK: "bg-rose-100 dark:bg-rose-950/40 border-l-4 border-rose-500",
  RED: "bg-rose-100 dark:bg-rose-950/40 border-l-4 border-rose-500",
  YELLOW: "bg-amber-100 dark:bg-amber-950/40 border-l-4 border-amber-500",
  GREEN: "bg-emerald-100 dark:bg-emerald-950/40 border-l-4 border-emerald-500",
};

function imnciRowStyle(cell?: string): string {
  if (!cell) return "";
  const key = cell.trim().toUpperCase().split(/\s|\//)[0];
  return IMNCI_ROW_STYLES[key] ?? "";
}

const TableSection = ({ columns, rows }: { columns: string[]; rows: string[][] }) => (
  <div className="-mx-1 overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
    <table className="w-full text-[12.5px] min-w-[340px]">
      <thead>
        <tr className="bg-slate-800 dark:bg-slate-950">
          {columns.map((c, i) => (
            <th key={i} className="text-left px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white align-top">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const tint = imnciRowStyle(row[0]);
          return (
            <tr key={i} className={tint || (i % 2 ? "bg-slate-50 dark:bg-white/[0.03]" : "")}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-2.5 py-2 align-top border-t border-slate-100 dark:border-white/10 ${
                    j === 0 ? "font-bold text-rose-600 dark:text-rose-300 whitespace-nowrap" : ""
                  } ${j > 0 && !tint ? "[&>*]:bg-amber-100" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const FlowchartSection = ({ steps }: { steps: { label: string; detail: string }[] }) => (
  <div className="space-y-2">
    {steps.map((step, i) => (
      <div key={i} className="flex gap-3">
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xs font-bold">
            {i + 1}
          </div>
          {i < steps.length - 1 && <div className="w-0.5 h-8 bg-cyan-500/30 my-1" />}
        </div>
        <div className="flex-1 rounded-lg border bg-muted/30 p-3">
          <p className="font-bold text-sm">{step.label}</p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{step.detail}</p>
        </div>
      </div>
    ))}
  </div>
);

const OutcomeSection = ({ text }: { text: string }) => (
  <div className="inline-block px-4 py-2 rounded-full border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 text-sm">
    Outcome: {text}
  </div>
);

const RevisionSection = ({ items }: { items: string[] }) => (
  <div className="rounded-xl border-2 border-dashed border-violet-400 dark:border-violet-500/60 bg-violet-50 dark:bg-violet-950/25 p-3.5">
    <p className="text-[9px] font-extrabold tracking-widest text-violet-500 dark:text-violet-300 mb-1">
      MNEMONIC \u2014 MUST-WRITE POINTS
    </p>
    <ol className="space-y-1.5 mt-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="text-violet-600 dark:text-violet-300 font-extrabold text-[13px] w-4 flex-shrink-0">
            {i + 1}
          </span>
          <p className="text-[13px] font-medium text-violet-950 dark:text-violet-100 leading-relaxed">{it}</p>
        </li>
      ))}
    </ol>
  </div>
);

/** ---------- Main view ---------- */
export default function HandwrittenNotesView({
  subtopicName, content,
}: { subtopicName: string; content: NotesContent }) {
  const askedCount = content.pyqYears?.length ?? 0;
  return (
    <div className="space-y-3.5 pb-2">
      {/* Chapter banner */}
      <div className="rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-3.5 text-white">
          <p className="text-[9px] tracking-[0.18em] uppercase text-white/80 mb-1">
            Handwritten Notes {askedCount > 0 ? "\u00b7 High Yield" : ""}
          </p>
          <h2 className="text-[19px] font-extrabold leading-tight tracking-tight uppercase">{subtopicName}</h2>
          {askedCount > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <StarsChip count={askedCount} />
              {content.pyqYears!.map((y) => (
                <span key={y} className="text-[9px] font-bold tracking-wider px-2 py-1 rounded bg-white/20 text-white uppercase">
                  {y}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Read this first */}
      {content.highYieldTip && (
        <div className="rounded-r-lg border-l-[3px] border-amber-400 bg-amber-50 dark:bg-amber-950/25 px-3.5 py-3">
          <div className="flex items-start gap-2">
            <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-300 mt-0.5 flex-shrink-0" />
            <p className="text-[12.5px] leading-relaxed text-amber-900 dark:text-amber-100">
              <span className="font-extrabold text-amber-700 dark:text-amber-300">Read this first \u2014 </span>
              {content.highYieldTip}
            </p>
          </div>
        </div>
      )}

      {/* Sections as exam sheets */}
      {content.sections.map((s, i) => (
        <div key={i} className="space-y-1.5">
          {s.pyqYears && s.pyqYears.length > 0 && <PyqBadge years={s.pyqYears} />}
          <SectionShell icon={s.icon} title={s.title} defaultOpen={i < 2}>
            {renderPayload(s)}
          </SectionShell>
        </div>
      ))}
    </div>
  );
}

function renderPayload(s: Section) {
  const p = s.payload ?? s ?? {};
  switch (s.type) {
    case "definition": return <DefinitionSection text={p.text ?? ""} />;
    case "text":       return <TextSection paragraph={p.paragraph ?? ""} />;
    case "bullets":    return <BulletsSection items={p.items ?? []} />;
    case "steps":      return <StepsSection items={p.items ?? []} />;
    case "morphology": return <MorphologySection subtitle={p.subtitle} items={p.items ?? []} />;
    case "comparison": return <ComparisonSection left={p.left ?? ""} right={p.right ?? ""} rows={p.rows ?? []} />;
    case "table":      return <TableSection columns={p.columns ?? []} rows={p.rows ?? []} />;
    case "flowchart":  return <FlowchartSection steps={p.steps ?? []} />;
    case "outcome":    return <OutcomeSection text={p.text ?? ""} />;
    case "revision":   return <RevisionSection items={Array.isArray(p.items) ? p.items : []} />;
    default:           return <TextSection paragraph={JSON.stringify(p)} />;
  }
}
