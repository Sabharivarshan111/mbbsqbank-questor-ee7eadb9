## Goal
Make the Question Bank search stop hanging/lagging while keeping the same visible behavior: same search results, same tabs, same no-results message, and same auto-expanded search results.

## Why it is still lagging
The previous debounce reduced the data filtering work, but the UI still receives the raw `searchQuery` immediately while typing. That means even before the debounced results are ready, the accordion tree is told “search is active”, so it starts re-rendering/expanding a large amount of question-bank UI.

There are also extra render loops in the accordion components:
- `TopicAccordion` and `SubtopicAccordion` create new `Object.keys(...)` arrays on every render.
- Their `useEffect` depends on those new arrays, so it can repeatedly call `setLocalExpandedItems` during search renders.
- Every accordion render also recalculates progress counts, which walks question data and checks `localStorage` many times.

## Implementation plan
1. **Use debounced search state for rendering expansion**
   - Keep the input value instant with `searchQuery`.
   - Add a hook return value like `activeSearchQuery`/`debouncedQuery` for the rendered question-bank content.
   - Use that debounced value for:
     - `NoResultsMessage` visibility
     - `QuestionBankContent searchQuery`
     - `TopicAccordion isExpanded`
   - This keeps the same behavior after the short pause, but stops the huge accordion tree from reacting to every typed character.

2. **Stabilize accordion key arrays**
   - In `TopicAccordion`, memoize `subtopicKeys` with `useMemo`.
   - In `SubtopicAccordion`, memoize `typeKeys` with `useMemo`.
   - This prevents effects from firing again just because a new array reference was created.

3. **Avoid unnecessary accordion state updates**
   - Only call `setLocalExpandedItems(...)` when the desired expanded keys are actually different from the current state.
   - Preserve current manual accordion behavior when not searching.

4. **Memoize progress-count work**
   - Update `useProgressCount` so collecting/counting questions is memoized for the current node/tab.
   - Keep completion tracking exactly the same.

5. **Verify behavior**
   - Type quickly in the Question Bank search box.
   - Confirm the input no longer freezes.
   - Confirm results still appear after the debounce pause.
   - Confirm search results still auto-expand and clearing search restores the full bank.

## Files to change
- `src/hooks/use-question-bank.ts`
- `src/components/QuestionBank.tsx`
- `src/components/question-bank/QuestionBankContent.tsx`
- `src/components/TopicAccordion.tsx`
- `src/components/SubtopicAccordion.tsx`
- `src/hooks/use-progress-count.ts`

No search features or UI design will be changed.