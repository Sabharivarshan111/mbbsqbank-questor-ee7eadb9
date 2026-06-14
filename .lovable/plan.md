## Goal

Keep the existing behavior — when searching in **Essay** and only **Short notes** match (or vice versa), show a "No essays found, switch to Short notes" prompt — but make typing perfectly smooth again. The current code filters BOTH tabs on every keystroke, which doubles the work and causes the lag the user noticed.

## The lag, root cause

`use-question-bank.ts` runs the heavy recursive `filterForTab` walk for **essay AND short-notes** on every debounced keystroke, even though only one tab is visible. The full bank is large, so the second walk is wasted ~95% of the time (the active tab almost always has results).

## Fix — cheap "any match" probe for the inactive tab

1. Keep filtering only the **active** tab (returns the full filtered tree used by `SearchResults`). This restores the original single-walk perf.
2. For the **inactive** tab, run a tiny `hasAnyMatch(tab, query)` helper that walks the bank and **returns true on the first matching question string** (early-exit, no tree cloning, no array allocations). This is 10–50× cheaper than the full filter and is only used to decide whether to show the "switch tab" hint.
3. Memoize both by `lowerQuery` so they don't recompute on unrelated re-renders.
4. Bump the search debounce from 220ms → keep at 220ms (already fine); the perf win comes from killing the second full filter, not the debounce.

## Files to change

- **`src/hooks/use-question-bank.ts`**
  - Revert `essayFilteredData` / `shortNotesFilteredData` to filter **only** the active tab (as before the previous change).
  - Add `hasAnyMatch(type, lowerQuery)` — recursive walk that returns `boolean` on first hit.
  - Compute `otherTabHasResults` from `hasAnyMatch` of the inactive tab when the active tab has no results.
  - Keep exporting `otherTabHasResults` and `hasSearchResults` exactly as today.

- **No changes** to `QuestionBank.tsx` — the existing "Switch to Short notes / Essay" UI built last turn already consumes `otherTabHasResults` and works.

## Technical detail

```ts
function hasAnyMatch(type: "essay" | "short-notes", q: string): boolean {
  const wantKeys = type === "essay" ? ["essay"] : ["short-notes", "short-note"];
  const walk = (node: any): boolean => {
    if (!node || typeof node !== "object") return false;
    if (Array.isArray(node.questions)) {
      for (const s of node.questions) if (s.toLowerCase().includes(q)) return true;
      return false;
    }
    for (const k of wantKeys) if (node[k] && walk(node[k])) return true;
    if (node.subtopics) for (const v of Object.values(node.subtopics)) if (walk(v)) return true;
    // Generic container (year-level)
    for (const [k, v] of Object.entries(node)) {
      if (k === "name" || k === "subtopics" || wantKeys.includes(k)) continue;
      if (walk(v)) return true;
    }
    return false;
  };
  for (const topic of Object.values(QUESTION_BANK_DATA)) if (walk(topic)) return true;
  return false;
}
```

## Outcome

- Typing latency returns to the pre-change "smooth" baseline (single filter walk per keystroke).
- "No essays found — Short notes match — switch" prompt still appears correctly in both directions.
- No DB or schema changes.
