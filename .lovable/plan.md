## Goals

1. Triple-tap responses currently skip Wikipedia images — fix so they also auto-attach images.
2. When Wikipedia has no thumbnail for a term (rare plants like *Ricinus communis*, weapons, niche objects), fall back to **Lovable AI imagegen** so the user always sees a visual + text.
3. Detect follow-up prompts like *"generate a flowchart / mind map / diagram for the above"* — read the previous user+assistant turn from chat history and generate a single illustrative image via Lovable imagegen, rendered inline in the answer.

---

## Changes

### 1. `supabase/functions/wiki-image/index.ts` — add imagegen fallback
- After Wikipedia lookup fails for a term, call Lovable AI Gateway `/v1/images/generations` with `openai/gpt-image-1-mini` (cheap, non-streaming, `quality: "low"`).
- Prompt template: `"Clean educational illustration of {term}, labeled diagram style, white background, no text overlays"`.
- Return the base64 PNG as a `data:image/png;base64,...` URL in the same `ImageResult` shape, with `caption: "AI-generated illustration"` and no `sourceUrl`.
- Cap fallback to max 2 generations per request to control credit usage; remaining missing terms are skipped silently.
- Use `LOVABLE_API_KEY` from env (already provisioned).

### 2. `src/hooks/use-ai-chat.ts` — triple-tap + follow-up flowchart support
- **Remove the triple-tap skip**: today `wiki-image` is only invoked for non-triple-tap assistant turns. Drop that condition so highlighted terms in triple-tap answers also fetch images.
- **Detect follow-up image intent** in user input: regex like `/(flow\s*chart|mind\s*map|diagram|infograph|illustrat(e|ion)|draw|sketch|visuali[sz]e)/i` AND a back-reference cue (`above|previous|last|that question|this`).
- When detected:
  - Pull the last assistant message + the user message before it from `messages` state to form context.
  - Call a new edge function `generate-diagram` (see #3) with `{ context, kind: "flowchart" | "mindmap" | "diagram" }`.
  - Append the returned image as a synthetic assistant message containing only `images: [{ term, imageUrl, caption }]` plus a one-line text intro ("Here's a flowchart based on your previous question:").
  - Skip the normal `ask-gemini` call for this turn.

### 3. New `supabase/functions/generate-diagram/index.ts`
- Input (Zod): `{ context: string (max 4000), kind: "flowchart" | "mindmap" | "diagram" }`.
- Build prompt: `"Create a clean, presentable {kind} illustrating the following medical concept. Use clear labeled boxes/branches, high contrast, white background, no decorative clutter. Concept: {context}"`.
- Call AI Gateway `openai/gpt-image-1-mini`, `quality: "low"`, non-streaming, return `{ imageUrl: "data:image/png;base64,..." }`.
- CORS + rate-limit (5/min/IP).

### 4. `src/components/chat/MessageImages.tsx` — layout polish
- When only 1 image is present (typical for generated diagrams), render larger (full width, max-h-80) instead of the horizontal snap-scroll row.
- Keep existing 3-up snap-scroll for multi-term Wikipedia rows.
- Caption + source attribution unchanged; AI-generated images show "Generated illustration" instead of "Source: Wikipedia".

### 5. `src/models/ChatMessage.ts`
- Extend `MessageImage` with optional `generated?: boolean` so the UI can label AI-generated images differently and skip the Wikipedia source link.

---

## Files

**New:**
- `supabase/functions/generate-diagram/index.ts`

**Modified:**
- `supabase/functions/wiki-image/index.ts` (imagegen fallback)
- `src/hooks/use-ai-chat.ts` (triple-tap fetch + follow-up diagram intent)
- `src/components/chat/MessageImages.tsx` (single-image layout)
- `src/models/ChatMessage.ts` (`generated` flag)

## Out of scope
- No new persistence; images stay in-memory like today.
- No changes to MCQ rendering, references, or highlighting tokens.
- No streaming for generated images (single small PNG — non-streaming JSON is simpler and fast enough at `low` quality).
