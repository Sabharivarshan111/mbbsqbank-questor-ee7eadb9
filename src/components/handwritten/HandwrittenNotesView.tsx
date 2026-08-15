import { Trophy } from "lucide-react";
import React from "react";

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

/** ---------- Inline text: **bold** -> amber highlight ---------- */
function inline(text: string): React.ReactNode[] {
  const parts = String(text ?? "").split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return (
        <mark
          key={i}
          className="bg-amber-200/80 dark:bg-amber-400/25 text-slate-900 dark:text-amber-100 font-semibold rounded-[3px] px-1 py-[1px]"
        >
          {p.slice(2, -2)}
        </mark>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

const T = ({ children }: { children: string }) => <>{inline(children)}</>;

/** ---------- Small primitives ---------- */
const StarsChip = ({ count }: { count: number }) => {
  if (!count) return null;
  const stars = "★".repeat(Math.min(3, count));
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white whitespace-nowrap">
      {stars} asked {count}×
    </span>
  );
};

const YearChip = ({ year, dark = false }: { year: string; dark?: boolean }) => (
  <span
    className={`text-[9px] font-bold tracking-wider px-2 py-1 rounded uppercase ${
      dark
        ? "bg-white/20 text-white"
        : "bg-slate-800 text-white dark:bg-white/15 dark:text-slate-100"
    }`}
  >
    {year}
  </span>
);

const AskedRow = ({ years }: { years?: string[] }) => {
  if (!years || years.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 px-2.5 py-2">
      <span className="text-[9px] font-extrabold tracking-widest px-2 py-1 rounded bg-amber-200 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200">
        {years.length}× ASKED
      </span>
      <span className="text-[9px] font-bold tracking-widest text-slate-400">IN</span>
      {years.map((y) => (
        <YearChip key={y} year={y} />
      ))}
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

/** Section heading — green left rule, like the reference sheet */
const SheetHeading = ({ icon, title, accent = "green" }: { icon?: string; title: string; accent?: "green" | "rose" }) => (
  <div className="flex items-start gap-2">
    <span
      className={`mt-0.5 w-[3px] self-stretch min-h-[18px] rounded-full ${
        accent === "rose" ? "bg-rose-500" : "bg-emerald-500"
      }`}
    />
    <h3
      className={`flex-1 text-[15px] font-extrabold leading-snug ${
        accent === "rose" ? "text-rose-600 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"
      }`}
    >
      {icon ? <span className="mr-1.5">{icon}</span> : null}
      {title}
    </h3>
  </div>
);

/** ---------- Section renderers ---------- */
const DefinitionSection = ({ text }: { text: string }) => (
  <div className="border-l-[3px] border-rose-500 bg-rose-50 dark:bg-rose-950/25 px-3.5 py-3 rounded-r-lg">
    <p className="text-[9px] font-extrabold tracking-widest text-rose-600 dark:text-rose-300 mb-1.5">
      DEFINITION — VERBATIM, AND LEARN BOTH
    </p>
    <p className="text-[13px] leading-relaxed text-rose-900 dark:text-rose-100 font-medium">
      <T>{text}</T>
    </p>
  </div>
);

const TextSection = ({ paragraph }: { paragraph: string }) => (
  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
    <T>{paragraph}</T>
  </p>
);

const BulletsSection = ({ items }: { items: { label: string; description: string }[] }) => (
  <ul className="space-y-2">
    {items.map((it, i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="mt-[7px] h-[5px] w-[5px] rounded-full bg-slate-800 dark:bg-slate-300 flex-shrink-0" />
        <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
          {it.label && <span className="font-bold text-slate-900 dark:text-slate-100">{inline(it.label)} </span>}
          <T>{it.description}</T>
        </p>
      </li>
    ))}
  </ul>
);

const StepsSection = ({ items }: { items: { title: string; description: string; keyTrigger?: string }[] }) => (
  <div className="space-y-2.5">
    {items.map((it, i) => (
      <div key={i} className="flex gap-2.5">
        <div className="h-6 w-6 mt-0.5 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
          {i + 1}
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{it.title}</p>
          <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
            <T>{it.description}</T>
          </p>
          {it.keyTrigger && (
            <span className="mt-1.5 inline-block text-[11px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 font-semibold">
              Key trigger: {it.keyTrigger}
            </span>
          )}
        </div>
      </div>
    ))}
  </div>
);

const MorphologySection = ({ subtitle, items }: { subtitle?: string; items: { title: string; tag?: string; details: string[] }[] }) => (
  <div className="space-y-3">
    {subtitle && (
      <p className="text-[11px] font-extrabold tracking-widest text-blue-600 dark:text-blue-300 uppercase">🔬 {subtitle}</p>
    )}
    {items.map((it, i) => (
      <div key={i}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="font-bold text-[13.5px] text-slate-900 dark:text-slate-100">{inline(it.title)}</p>
          <TagChip tag={it.tag} />
        </div>
        <ul className="ml-1 border-l-2 border-slate-200 dark:border-white/10 pl-3 space-y-1">
          {it.details.map((d, j) => (
            <li key={j} className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
              <T>{d}</T>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

const ComparisonSection = ({ left, right, rows }: { left: string; right: string; rows: { label: string; left: string; right: string }[] }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
    <table className="w-full text-[12.5px] min-w-[340px]">
      <thead>
        <tr className="bg-slate-800 dark:bg-slate-950 text-white">
          <th className="text-left px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider">Feature</th>
          <th className="text-left px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider">{left}</th>
          <th className="text-left px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider">{right}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 ? "bg-slate-50 dark:bg-white/[0.03]" : ""}>
            <td className="px-2.5 py-2 align-top border-t border-slate-100 dark:border-white/10 font-bold text-rose-600 dark:text-rose-300">
              {r.label}
            </td>
            <td className="px-2.5 py-2 align-top border-t border-slate-100 dark:border-white/10">
              <T>{r.left}</T>
            </td>
            <td className="px-2.5 py-2 align-top border-t border-slate-100 dark:border-white/10">
              <T>{r.right}</T>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
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
                    j === 0 ? "font-bold text-rose-600 dark:text-rose-300" : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <T>{cell}</T>
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
      <div key={i} className="flex gap-2.5">
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="h-6 w-6 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-[11px] font-bold">
            {i + 1}
          </div>
          {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-cyan-500/30 my-1" />}
        </div>
        <div className="flex-1 pb-1">
          <p className="font-bold text-[13.5px] text-slate-900 dark:text-slate-100">{inline(step.label)}</p>
          <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            <T>{step.detail}</T>
          </p>
        </div>
      </div>
    ))}
  </div>
);

const OutcomeSection = ({ text }: { text: string }) => (
  <div className="inline-block px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 text-[13px] font-medium">
    Outcome: {inline(text)}
  </div>
);

const RevisionSection = ({ items, title }: { items: string[]; title?: string }) => (
  <div className="rounded-xl border-2 border-dashed border-violet-400 dark:border-violet-500/60 bg-violet-50 dark:bg-violet-950/25 p-3.5">
    <p className="text-[9px] font-extrabold tracking-widest text-violet-500 dark:text-violet-300">
      MNEMONIC — MUST-WRITE POINTS
    </p>
    {title && (
      <p className="text-[19px] font-extrabold text-violet-700 dark:text-violet-200 mt-1 leading-tight">{title}</p>
    )}
    <ol className="space-y-1.5 mt-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="text-violet-600 dark:text-violet-300 font-extrabold text-[13px] w-4 flex-shrink-0">{i + 1}</span>
          <p className="text-[13px] font-medium text-violet-950 dark:text-violet-100 leading-relaxed">
            <T>{it}</T>
          </p>
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
    <div className="space-y-3 pb-3">
      {/* Chapter banner */}
      <div className="rounded-xl overflow-hidden shadow-sm bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-3.5 text-white">
        <p className="text-[9px] tracking-[0.18em] uppercase text-white/85 mb-1">
          Handwritten Notes{askedCount > 0 ? " · High Yield" : ""}
        </p>
        <h2 className="text-[19px] font-extrabold leading-tight tracking-tight uppercase">{subtopicName}</h2>
        {askedCount > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <StarsChip count={askedCount} />
            {content.pyqYears!.map((y) => (
              <YearChip key={y} year={y} dark />
            ))}
          </div>
        )}
      </div>

      {/* Read this first */}
      {content.highYieldTip && (
        <div className="rounded-r-lg border-l-[3px] border-amber-400 bg-amber-50 dark:bg-amber-950/25 px-3.5 py-3">
          <div className="flex items-start gap-2">
            <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-300 mt-0.5 flex-shrink-0" />
            <p className="text-[12.5px] leading-relaxed text-amber-900 dark:text-amber-100">
              <span className="font-extrabold text-amber-700 dark:text-amber-300">Read this first — </span>
              <T>{content.highYieldTip}</T>
            </p>
          </div>
        </div>
      )}

      {/* One continuous exam sheet — always open, no accordions */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 shadow-sm divide-y divide-slate-100 dark:divide-white/10">
        {content.sections.map((s, i) => {
          const isMnemonic = s.type === "revision";
          return (
            <section key={i} className="px-3.5 py-3.5 space-y-2.5">
              {!isMnemonic && (
                <SheetHeading
                  icon={s.icon}
                  title={s.title}
                  accent={s.type === "definition" || s.type === "comparison" ? "rose" : "green"}
                />
              )}
              {s.pyqYears && s.pyqYears.length > 0 && <AskedRow years={s.pyqYears} />}
              {renderPayload(s)}
            </section>
          );
        })}
      </div>
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
    case "revision":   return <RevisionSection items={Array.isArray(p.items) ? p.items : []} title={s.title} />;
    default:           return <TextSection paragraph={typeof p === "string" ? p : JSON.stringify(p)} />;
  }
}
