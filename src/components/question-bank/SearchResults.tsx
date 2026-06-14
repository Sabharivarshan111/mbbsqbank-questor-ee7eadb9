import { useEffect, useMemo, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import { QuestionBankData } from "@/components/QuestionBank";

interface FlatGroup {
  path: string;
  yearKey: string;
  questions: string[];
}

function flatten(data: QuestionBankData, tab: "essay" | "short-notes"): FlatGroup[] {
  const groups: FlatGroup[] = [];
  const wantKeys = tab === "essay" ? ["essay"] : ["short-notes", "short-note"];
  const skipKeys = tab === "essay"
    ? new Set(["short-notes", "short-note"])
    : new Set(["essay"]);

  const walk = (node: any, pathParts: string[], yearKey: string) => {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node.questions) && node.questions.length) {
      groups.push({
        path: pathParts.join(" › "),
        yearKey,
        questions: node.questions as string[],
      });
      return;
    }

    for (const k of wantKeys) {
      if (node[k]) walk(node[k], [...pathParts, node.name ?? ""].filter(Boolean), yearKey);
    }

    if (node.subtopics && typeof node.subtopics === "object") {
      for (const [k, v] of Object.entries(node.subtopics)) {
        // Strict: never descend into the other type's bucket, even when it
        // lives inside `subtopics`.
        if (skipKeys.has(k)) continue;
        const childName = (v as any)?.name;
        const nextPath = node.name && pathParts[pathParts.length - 1] !== node.name
          ? [...pathParts, node.name]
          : pathParts;
        walk(v, childName ? nextPath : nextPath, yearKey);
      }
    }
  };

  for (const [yearKey, topic] of Object.entries(data)) {
    walk(topic, [(topic as any)?.name ?? yearKey], yearKey);
  }
  return groups;
}

const INITIAL_BATCH = 30;
const BATCH_SIZE = 40;

interface Props {
  data: QuestionBankData;
  activeTab: "essay" | "short-notes";
}

const SearchResults = ({ data, activeTab }: Props) => {
  const groups = useMemo(() => flatten(data, activeTab), [data, activeTab]);
  const flat = useMemo(() => {
    const items: { group: FlatGroup; question: string; localIndex: number }[] = [];
    for (const g of groups) {
      for (let i = 0; i < g.questions.length; i++) {
        items.push({ group: g, question: g.questions[i], localIndex: i });
      }
    }
    return items;
  }, [groups]);

  const [visible, setVisible] = useState(() => Math.min(INITIAL_BATCH, flat.length));

  useEffect(() => {
    setVisible(Math.min(INITIAL_BATCH, flat.length));
  }, [flat]);

  useEffect(() => {
    if (visible >= flat.length) return;
    const id = window.setTimeout(() => {
      setVisible((v) => Math.min(v + BATCH_SIZE, flat.length));
    }, 30);
    return () => window.clearTimeout(id);
  }, [visible, flat.length]);

  if (flat.length === 0) return null;

  // Group sequential items that share the same path for compact rendering.
  const slice = flat.slice(0, visible);
  const rendered: { group: FlatGroup; items: { question: string; localIndex: number }[] }[] = [];
  for (const item of slice) {
    const last = rendered[rendered.length - 1];
    if (last && last.group === item.group) {
      last.items.push({ question: item.question, localIndex: item.localIndex });
    } else {
      rendered.push({ group: item.group, items: [{ question: item.question, localIndex: item.localIndex }] });
    }
  }

  const typeLabel = activeTab === "essay" ? "Essay" : "Short note";
  const typeBadgeClass =
    activeTab === "essay"
      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";

  return (
    <div className="space-y-6">
      {rendered.map((block, i) => (
        <div key={`${block.group.path}-${i}`} className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h6 className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">
              {block.group.path}
            </h6>
            <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${typeBadgeClass}`}>
              {typeLabel}
            </span>
          </div>
          <div className="space-y-2">
            {block.items.map((it) => (
              <QuestionCard
                key={`${block.group.path}-${it.localIndex}`}
                question={it.question}
                index={it.localIndex}
                isFirstYear={block.group.yearKey === "first-year"}
              />
            ))}
          </div>
        </div>
      ))}
      {visible < flat.length && (
        <div className="text-center text-xs text-gray-500 py-2">Loading more results…</div>
      )}
    </div>
  );
};

export default SearchResults;
