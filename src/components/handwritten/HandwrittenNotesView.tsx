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
    <div className="inline-block bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold tracking-wide px-3 py-1.5 rounded-md mb-3">
      PYQ {years.join(", ")}
    </div>
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
  <div className="border-l-4 border-primary bg-muted/40 p-4 rounded-r-lg">
    <p className="text-sm leading-relaxed">{text}</p>
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
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-muted/60">
          {columns.map((c, i) => (
            <th key={i} className="text-left p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground align-top">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const tint = imnciRowStyle(row[0]);
          return (
            <tr key={i} className={tint || (i % 2 ? "bg-muted/20" : "")}>
              {row.map((cell, j) => (
                <td key={j} className={`p-3 align-top border-t ${j === 0 && tint ? "font-bold" : ""}`}>{cell}</td>
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
  <div className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 p-4">
    <div className="flex items-center gap-2 mb-3">
      <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-300" />
      <p className="font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-200 text-sm">Must-Write Points</p>
    </div>
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-0.5 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-extrabold flex-shrink-0">
            {i + 1}
          </span>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 leading-relaxed">{it}</p>
        </li>
      ))}
    </ul>
  </div>
);

/** ---------- Main view ---------- */
export default function HandwrittenNotesView({
  subtopicName, content,
}: { subtopicName: string; content: NotesContent }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-900 to-blue-950 text-white p-5">
        <p className="text-[10px] tracking-widest uppercase text-blue-200 mb-1">Handwritten Notes</p>
        <h2 className="text-2xl font-extrabold">{subtopicName}</h2>
        {content.pyqYears && content.pyqYears.length > 0 && (
          <div className="mt-3 inline-block bg-white/10 backdrop-blur text-blue-100 text-xs font-semibold px-3 py-1.5 rounded-full">
            📖 PYQ {content.pyqYears.join(", ")}
          </div>
        )}
      </div>

      {/* High-Yield Tip */}
      {content.highYieldTip && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-200 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <p className="font-bold text-amber-700 dark:text-amber-300 mb-1">High-Yield Tip</p>
              <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">{content.highYieldTip}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      {content.sections.map((s, i) => (
        <div key={i}>
          <PyqBadge years={s.pyqYears} />
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
    default:           return <TextSection paragraph={JSON.stringify(p)} />;
  }
}
