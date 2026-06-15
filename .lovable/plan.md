# Smarter, illustrated AI medical chat

Two upgrades to the AI medical chatbox, applied to every assistant answer (not just triple-tap):

1. **Key medical terms bolded + color-coded** so important words pop.
2. **Auto-attached relevant images** sourced from Wikipedia / Wikimedia Commons (free, real medical illustrations).

Everything is laid out cleanly with spacing — never crammed.

## 1. Color-coded medical highlighting

The model already returns markdown `**bold**`. We'll extend the prompt so the AI wraps key terms in lightweight tags by category, then style them in the renderer:

| Category | Color | Example |
|---|---|---|
| Disease / condition | red | **myocardial infarction** |
| Drug / treatment | blue | **aspirin** |
| Anatomy / structure | green | **left ventricle** |
| Investigation / sign | amber | **ECG**, **Murphy's sign** |
| Key value / dose | purple | **300 mg** |

Tag format the AI will emit: `[[dis:myocardial infarction]]`, `[[drug:aspirin]]`, `[[anat:left ventricle]]`, `[[inv:ECG]]`, `[[val:300 mg]]`.
A small parser in `ChatMessageItem.tsx` converts these into styled `<span>`s with bold weight + the matching token color (defined as semantic CSS variables in `index.css` so light/dark both look right). Falls back gracefully to plain bold if tag is malformed.

## 2. Auto-relevant images (Wikimedia Commons)

For every assistant answer:

1. After the answer streams in, take the top 1–3 medical key terms (extracted from the `[[dis:]]` / `[[anat:]]` / `[[inv:]]` tags above, in that priority order).
2. Call a new Supabase Edge Function `wiki-image` that queries Wikipedia's free REST API:
   - `https://en.wikipedia.org/api/rest_v1/page/summary/{term}` → returns `thumbnail.source` (a Commons image) + short description + page URL.
   - If no thumbnail, fall back to Commons search API.
3. Return up to 3 `{ term, imageUrl, caption, sourceUrl }` items to the client.
4. Render them in a new `MessageImages` component below the answer text — a horizontal scroll/grid of clean image cards (rounded, padded, captioned, "Source: Wikipedia" link). Lazy-loaded, fixed aspect ratio, generous spacing.

No API key needed — Wikipedia REST is public and free. Images are CC-licensed; we always show attribution + source link to stay compliant.

## Layout (clean, not congested)

```text
┌─ Assistant message ──────────────────────────┐
│ ACEV                                    [⧉]  │
│                                              │
│ Answer paragraph with red disease term,      │
│ blue drug term, green anatomy term…          │
│                                              │
│ ── images ──                                 │
│  [img]   [img]   [img]                       │
│  caption caption caption                     │
│                                              │
│ References ▾                                 │
└──────────────────────────────────────────────┘
```

Spacing: `space-y-3` between text/images/references, image cards `gap-3`, captions `text-xs text-muted-foreground mt-1`. On mobile (current 384px viewport) the row becomes a horizontal snap-scroll so nothing wraps awkwardly.

## Technical details

**Files to add:**
- `supabase/functions/wiki-image/index.ts` — accepts `{ terms: string[] }`, queries Wikipedia REST, returns image list. Zod-validated, CORS, 10 req/min rate limit, 5s timeout per term.
- `src/components/chat/MessageImages.tsx` — image card grid with captions + source attribution.
- `src/lib/highlight-medical.ts` — parses `[[cat:term]]` tags into React nodes.

**Files to modify:**
- `supabase/functions/ask-ai/index.ts` — extend system prompt to instruct the model to wrap key terms in `[[cat:term]]` tags (5 categories above), keep markdown otherwise unchanged.
- `src/components/chat/ChatMessageItem.tsx` — run the highlight parser before/inside `ReactMarkdown` (custom `text` renderer), render `<MessageImages>` below the answer.
- `src/models/ChatMessage.ts` — add optional `images?: { term, imageUrl, caption, sourceUrl }[]` field.
- `src/hooks/use-ai-chat.ts` — after assistant message finalises, extract top terms, call `wiki-image`, attach `images` to the message.
- `src/index.css` — add semantic tokens: `--medical-disease`, `--medical-drug`, `--medical-anat`, `--medical-inv`, `--medical-value` (HSL, with dark-mode variants).
- `tailwind.config.ts` — expose those tokens as text colors.

**Scope guardrails:**
- Triple-tap still works as today; the new highlighting + images apply to all assistant messages, so triple-tap automatically benefits too (no separate triple-tap path needed).
- MCQ messages (`kind === 'mcq'`) skip the image fetch to avoid clutter; highlighting still applies.
- If `wiki-image` returns nothing or errors, the message renders normally with no image section — silent, no error toast.
