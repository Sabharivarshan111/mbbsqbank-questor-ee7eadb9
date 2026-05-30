## Hide year-level count badge until expanded

Year accordions (First/Second/Third/Final Year) currently show the total count badge always. Hide it when collapsed, show it only when the year is expanded. Subject/subtopic badges inside remain unchanged.

### Change — `src/components/TopicAccordion.tsx`
- Add a marker class `year-count-badge` to the `<CountBadge />` wrapper at line 55 (wrap it in a `<span className="year-count-badge">`).

### Change — `src/index.css`
- Add a small global rule:
  ```css
  [data-state="closed"] > .year-count-badge,
  [data-state="closed"] .year-count-badge {
    display: none;
  }
  ```
  Scoped via the `data-state` attribute Radix puts on the `AccordionItem` / trigger, so the badge only renders when its enclosing year accordion is open. Subtopic badges (rendered inside `SubtopicAccordion`) are unaffected because they don't carry the `year-count-badge` class.

### Out of scope
- No change to `SubtopicAccordion`, `TypeAccordion`, or `countQuestions` logic.
- No backend / data changes.
