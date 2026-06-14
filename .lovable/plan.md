## Goal

When searching, each result card should clearly show whether the question is an **Essay** or **Short Note**, so users can identify the question type at a glance.

## Change

`src/components/question-bank/SearchResults.tsx` already groups results by breadcrumb path (e.g. "Final Year › Surgery › …"). Add a small colored badge next to that breadcrumb header indicating the type:

- **Essay** — purple/violet badge
- **Short note** — emerald/green badge

The badge derives from the `activeTab` prop (already passed in), since results are filtered per-tab. No new data needed.

## Files

- `src/components/question-bank/SearchResults.tsx` — render a `<span>` badge next to each group's path heading.

That's it — one tiny visual addition, zero perf cost, no logic changes.
