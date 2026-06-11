# Interactive MCQ Cards in AI Chat

Transform the double-tap "Generate MCQs" flow so that:
1. The user's prompt (`Double-tapped: Generate 10 USMLE/NEET PG style MCQs on …`) is hidden from the chat transcript.
2. The AI's text response is parsed into clean, clickable MCQ cards styled like the reference screenshot (dark cards, option pills A/B/C/D, red ring on wrong tap, green ring on correct, short explanation below).

All work stays inside the existing AI chat box — no new pages, no backend changes.

## Changes

### 1. Hide the MCQ-generation user message
- `src/hooks/use-ai-chat.ts` — when a message's content starts with `Double-tapped: Generate` (or matches the MCQ-trigger pattern), set a flag on the `ChatMessage` (e.g. `hidden: true` or `kind: 'mcq-trigger'`).
- `src/components/AiChat.tsx` — filter out hidden messages from the `messages.map(...)` render loop. Keep them in state so history/clear logic is unchanged.
- Add an optional `hidden?: boolean` / `kind?: 'mcq'` field on `ChatMessage` in `src/models/ChatMessage.ts`.

### 2. Tag MCQ assistant replies
- In `use-ai-chat.ts`, when the trigger we just sent was an MCQ request, mark the resulting assistant message with `kind: 'mcq'` so the renderer knows to switch to the card UI instead of markdown.
- Strengthen the system prompt sent for MCQ requests to return a strict, parseable structure (e.g. JSON fenced block or a fixed text format with `Q:`, `A) … D)`, `Answer:`, `Explanation:`). Keep the rest of the chat behavior unchanged.

### 3. New `McqCard` component
- New file `src/components/chat/McqCard.tsx`:
  - Parses one MCQ block into `{ topic, question, options[A-D], correct, explanation }`.
  - Renders header pill (e.g. `MCQ • Topic`), the question text, then 4 option rows with letter circle + label.
  - Local state `selected`. On click:
    - If wrong: that option gets a red ring + soft red bg, the correct one auto-highlights green.
    - If correct: that option gets a green ring + soft green bg.
  - After selection, render a short `Explanation` block below (uses `explanation` text, truncated/condensed to fit).
  - Disabled clicks after first selection (single attempt per card).
- New file `src/components/chat/McqMessage.tsx`:
  - Takes the raw assistant content, splits it into multiple MCQ blocks, and renders a vertical stack of `McqCard`s. Falls back to normal markdown if parsing fails.

### 4. Route MCQ messages to the card UI
- `src/components/chat/ChatMessageItem.tsx`:
  - If `message.kind === 'mcq'` (assistant), render `<McqMessage content={cleanContent} />` instead of `ReactMarkdown`.
  - Keep the existing markdown path for all other assistant messages.
  - User messages with `hidden` aren't rendered at all (handled in step 1).

### 5. Styling
- Match the screenshot using existing Tailwind tokens:
  - Card: `rounded-2xl bg-card/60 border border-border` with subtle padding.
  - Option row: `rounded-full bg-muted/40` with a circular letter badge.
  - Wrong selected: `ring-2 ring-red-500 bg-red-500/10`, badge `bg-red-500/20 text-red-400`.
  - Correct (auto-revealed or selected): `ring-2 ring-green-500 bg-green-500/10`, badge `bg-green-500/20 text-green-400`.
  - Explanation block: small muted text under the options inside the same card.
- Compact spacing so the card fits inside the chat box without overflow; long explanations get clamped to a few lines with a "Show more" toggle.

## Technical notes
- No edge function / Supabase changes.
- The MCQ trigger detection is a single regex on the outgoing user prompt — easy to extend later.
- Parser is defensive: if the model returns slightly off-format text, `McqMessage` falls back to the existing markdown renderer so nothing breaks.
- No changes to the search/QuestionBank performance work done earlier.

## Out of scope
- Persisting MCQ answers across sessions.
- Scoring / streak tracking.
- Changing the non-MCQ chat UI.
