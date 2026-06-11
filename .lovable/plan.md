Plan:

1. Stop doing unnecessary search work
   - In `use-question-bank.ts`, filter only the active tab instead of calculating both Essay and Short Notes every time the user types.
   - Keep the same search box, tabs, and results behavior.

2. Add a true lightweight search-results mode
   - When search is active, do not mount the full nested accordion tree with progress badges at every level.
   - Render only the matched question cards in small global batches, grouped under their existing year/subject/topic labels.
   - This preserves what users see as results, but avoids opening hundreds of accordions/components at once.

3. Reduce repeated localStorage/progress work during search
   - Avoid recalculating done/total badges for every nested accordion while search results are being typed/rendered.
   - Keep normal progress badges unchanged outside search.

4. Validate on mobile
   - Test with broad terms like `poison`, `autopsy`, and `injury`.
   - Confirm the app does not freeze, the input stays responsive, and results still appear correctly.