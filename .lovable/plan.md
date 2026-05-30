Add per-question completion tracking for Essay and Short Notes, persisted in localStorage.

## Behavior
- Each question gets a checkbox (or tap-to-toggle). When checked, the question text gets a strike-through and slightly dimmed color.
- The count badge ("20 ESSAY" / "20 SHORT") becomes a progress badge: `0/20 ESSAY` → `1/20 ESSAY` … `20/20 ESSAY`. Same for SHORT.
- Progress aggregates upward: subject, year, and group accordions also reflect `completed/total`.
- State persists across reloads and app relaunches via localStorage.

## Technical notes
- New hook `src/hooks/use-question-progress.ts`:
  - localStorage key: `question-progress-v1` → `{ [questionId]: true }`.
  - `questionId` = stable hash of `tab + topicPath + questionText` (so identical text under different subjects stays independent).
  - Exposes `isDone(id)`, `toggle(id)`, `getStats(ids)` returning `{ done, total }`.
  - Uses a small pub/sub so all badges re-render on toggle without prop drilling.
- Update `src/components/question-bank/CountBadge.tsx` to accept `done` and render `done/total LABEL` (keeping current amber styling for both tabs).
- Update the question list renderer (in `QuestionSection.tsx` / `TypeAccordion.tsx` — whichever shows the leaf questions) to:
  - Render a small checkbox before each question.
  - Apply `line-through opacity-60` to the text when completed.
  - Call `toggle(id)` on click.
- Update places that compute count (`src/lib/question-count.ts` and `CountBadge` consumers in `TypeAccordion`, `SubtopicAccordion`, `TopicAccordion`) to also compute completed count from the same id list and pass `done` to `CountBadge`.

## Out of scope
- No reset/clear-all UI in this pass (can be added later if needed).
- No cloud sync — local only.