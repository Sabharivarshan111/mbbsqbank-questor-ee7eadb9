# Fix: Question Bank search lag (behavior preserved)

## Goal
Stop the Question Bank from freezing while typing in the search bar. **Every existing search behavior stays exactly the same** — same results, same auto-expand of all topics on search, same empty state, same tabs.

## Root cause
`src/hooks/use-question-bank.ts` re-walks the entire `QUESTION_BANK_DATA` tree on every keystroke (twice — essays + short-notes), and:
1. **No debounce** — the heavy walk fires on every keystroke.
2. **`setState` inside `useMemo`** (`setHasSearchResults`, `setIsSearching` inside `getFilteredData`) — forces an extra render after each memo run.
3. **Cloning every node** with object spread even when no children matched, allocating large objects unnecessarily.

## Fix (only `src/hooks/use-question-bank.ts`)

1. **Debounce filtering by ~180 ms.**
   - `searchQuery` (what the input shows) stays instant.
   - A new internal `debouncedQuery` drives the filter memos.
   - Auto-expand effect also runs on `debouncedQuery` so the accordion only updates once typing settles — no behavior change, just smoother.

2. **Move `hasSearchResults` / `isSearching` out of `useMemo`.**
   - Compute them as derived values from the memoized filtered data (no `setState` inside memos).
   - External API of the hook is unchanged.

3. **Avoid needless cloning in `filterNestedContent`.**
   - When a child returns unchanged or nothing was pruned, return the original reference instead of spreading into a new object.
   - Pure perf; output shape is identical.

4. **Keep auto-expand-all on search.** No UI change.

## What is NOT changing
- Search matching logic, case-insensitive substring match.
- Auto-expansion of all topics when a search is active.
- Empty-state ("No results") behavior.
- Tabs (Essay / Short Notes / Extras).
- Component files, styling, anything outside this hook.

## File touched
- `src/hooks/use-question-bank.ts` only.

## Verification
- Typing fast in the search bar feels smooth on mobile (no freeze).
- After a brief pause results appear and all topics auto-expand (same as today).
- Clearing search collapses topics and restores full bank (same as today).
- "No results" still appears when nothing matches.
