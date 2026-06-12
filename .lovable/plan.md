# Plan: AI Chat MCQ + Keyboard fixes

## 1. "Generating MCQs, please wait…" placeholder

**Where:** `src/hooks/use-ai-chat.ts` (MCQ branch) + `src/components/chat/ChatMessageItem.tsx`.

- When an MCQ request is sent, immediately push a placeholder assistant message with `kind: 'mcq'` and `content: '__LOADING__'` (or a `loading: true` flag on the message).
- Replace this placeholder with the real response when the AI returns (instead of appending a new one).
- In `McqMessage` (or `ChatMessageItem`), if content is the loading sentinel, render a small shimmer row: spinner + "Generating MCQs, please wait…" so the user knows MCQs are on the way.

## 2. MCQ answers reset when expanding/collapsing fullscreen

**Root cause:** `AiChat.tsx` conditionally renders the chat tree inside `createPortal(...)` when fullscreen, and inline when not. Switching unmounts/remounts every `McqCard`, wiping its local `useState(selected)`. That's why marked answers disappear on toggle.

**Fix:** lift MCQ selection state out of `McqCard` so it survives remounts.

- Add a lightweight in-memory store keyed by `messageId + mcqIndex` (a module-level `Map` or a tiny Zustand/`useSyncExternalStore`, or just a React context provider mounted high enough — simplest: module-level `Map` + a `useMcqAnswer(messageId, idx)` hook with `useSyncExternalStore` so cards re-render).
- Pass `messageId` from `ChatMessageItem` → `McqMessage` → `McqCard`.
- `McqCard` reads/writes selection through the hook instead of `useState`. On toggle fullscreen the cards remount but read the same persisted selection, so red/green highlight + explanation stay.
- (Alternative considered: keep `AiChat` always mounted and just toggle CSS for fullscreen. Bigger refactor and risks breaking the portal/scroll behavior, so we prefer the lifted-state fix.)

## 3. Keyboard overlaps the input on mobile

**Where:** `src/components/AiChat.tsx` (fullscreen wrapper) and `src/components/chat/ChatInput.tsx`.

- In non-fullscreen mode, on textarea `focus` scroll the input into view: `textareaRef.current?.scrollIntoView({ block: 'center' })` after a short delay so the keyboard has opened.
- In fullscreen mode, switch the wrapper to use `visualViewport` height so the layout shrinks above the keyboard:
  - Track `window.visualViewport.height` with a `useEffect` listener and apply it as inline `height` (instead of `100dvh`) when defined.
  - This pushes the `CardFooter` (input) up so it sits right above the keyboard.
- Ensure the messages scroll container shrinks (already `flex-1 min-h-0`), so only the transcript area collapses, keeping the composer visible.

## Out of scope
- No changes to AI prompt format, MCQ parsing, or non-MCQ chat rendering.
- No persistence of MCQ answers across page reloads (in-memory only).

## Technical notes
- Loading sentinel keeps the existing message-array shape — no new model field required, but optionally add `loading?: boolean` to `ChatMessage` for clarity.
- The MCQ answer store is intentionally module-scoped (not Context) so it survives the portal/inline remount without needing a provider that also moves.
- `visualViewport` is available on iOS Safari and Android Chrome; we fall back to `100dvh` when it's undefined.
