## Root cause

The bank data nests type buckets **inside `subtopics`**, e.g.:

```
"general-anatomy": {
  subtopics: {
    "short-notes": { name: "Short Notes", questions: [...] }
  }
}
```

But `filterForTab` in `src/hooks/use-question-bank.ts` and `flatten` in `src/components/question-bank/SearchResults.tsx` both **iterate every subtopic entry regardless of the active type**. So when you search "long bone" on the Essay tab, the walker still descends into the `short-notes` subtopic, hits the leaf `{ questions: [...] }`, matches the string, and returns it — then the UI slaps an "Essay" badge on it.

That's why the same Short-note question appears under both tabs.

## Fix (two surgical edits, no perf cost)

1. **`src/hooks/use-question-bank.ts` → `filterForTab`**
   In the `content.subtopics` branch, skip entries whose key is the wrong type:
   - essay tab → skip keys `"short-notes"` and `"short-note"`
   - short-notes tab → skip key `"essay"`

2. **`src/components/question-bank/SearchResults.tsx` → `flatten`'s `walk`**
   Same guard when iterating `node.subtopics`: skip wrong-type keys.

This makes type filtering strict at every level, so an Essay search returns essays only, and a Short-note search returns short notes only.

## Result with the existing "switch tab" hint

The hint logic from the previous turn already does the right thing once filtering is strict:
- Search "long bone" in **Essay** → no essay matches → existing fallback shows **"No essays found — short notes match — Switch to Short notes"**.
- Click it → Short notes tab renders the question with the correct **Short note** badge.

## Files

- `src/hooks/use-question-bank.ts` — add type-aware skip in the `subtopics` loop of `filterForTab`.
- `src/components/question-bank/SearchResults.tsx` — same skip in `walk`'s `subtopics` loop.

No DB, no new dependencies, no extra hooks. Typing stays smooth — we're removing wasted work, not adding any.
