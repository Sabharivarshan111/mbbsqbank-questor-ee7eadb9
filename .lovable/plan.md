Change the "SHORT" count badge color in `src/components/question-bank/CountBadge.tsx` from indigo to amber so it matches the "ESSAY" badge styling:

- Remove the indigo class branch and use the same `bg-amber-500/15 text-amber-600 dark:text-amber-400` for both `essay` and `short-notes` tabs.
- Keep the label text ("ESSAY" / "SHORT") unchanged.

No other files affected.