## Goal

Display the number of questions inside each subtopic/type header in the question bank accordions, matching whichever tab is active (Essays vs Short Notes). For example, a subtopic containing 9 short notes would show a "9 SHORT" badge when on the Short Notes tab; "2 ESSAY" when on the Essays tab.

## Where the count badges appear

- `TypeAccordion` (leaf — directly wraps essay / short-note arrays): show a badge next to the title with the count for the active tab.
- `SubtopicAccordion` (mid-level — e.g. "Paper 1", "General"): show an aggregated badge summing counts across all nested types for the active tab.
- `TopicAccordion` (top — Year / Subject like "Physiology"): also show aggregated count badge for the active tab.

If the count is 0 for the active tab, no badge is rendered (keeps the header clean).

## Badge styling

Small pill, matching the existing app theme (using semantic tokens, not hardcoded colors):
- Essay tab: amber/orange tinted pill — e.g. `bg-amber-500/15 text-amber-600 dark:text-amber-400`
- Short Notes tab: indigo/blue tinted pill — e.g. `bg-indigo-500/15 text-indigo-600 dark:text-indigo-400`
- Format: `{count} ESSAY` or `{count} SHORT`
- Placed inline after the title text, before the chevron.

## Implementation

1. **New util** `src/lib/question-count.ts`:
   - `countQuestions(node, tab)` — recursive walker over the data shape. Handles:
     - Leaf shape: `{ essay: { questions: [] }, "short-note"/"short-notes": { questions: [] } }`
     - Nested shape: `{ subtopics: {...} }`
   - Returns number of questions matching the active tab (`essay` or `short-notes`).

2. **`TypeAccordion.tsx`**: compute count from `type` for `activeTab`, render badge in trigger.

3. **`SubtopicAccordion.tsx`**: compute aggregated count from `subtopic` for `activeTab`, render badge in trigger.

4. **`TopicAccordion.tsx`**: compute aggregated count from `topic` for `activeTab`, render badge in trigger.

5. Small `CountBadge` component (inline or in `src/components/question-bank/CountBadge.tsx`) to keep the three call sites consistent.

## Out of scope

- No data changes, no MCQ counts (separate flow), no year-range text, no completion (`0/12`) tracking — only adding count badges that reflect the active Essays/Short Notes tab.
