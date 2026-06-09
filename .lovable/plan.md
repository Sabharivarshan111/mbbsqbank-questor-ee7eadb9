# Fix: Subtopic-only queries in AI chat

## Problem
When the user types only a subtopic name like "important questions in disaster management" without naming a subject (Community Medicine, etc.), the matcher currently fuzzy-matches the words against subject names/aliases and returns a wrong subject (e.g. ENT). It should instead search every subject's subtopic tree and pick the best subtopic match.

## Fix (only `src/lib/high-yield-query.ts`)

1. **Make subject matching stricter**
   - In `matchSubject`, require alias/name matches to be real (full phrase substring or strong token overlap). Drop the loose single-token fuzzy fallback that currently lets unrelated words like "disaster" map to "ENT" / "ortho" via edit distance.
   - Only return a subject when confidence is high (phrase hit, full name hit, or ≥2 significant tokens matched).

2. **New: global subtopic search when no subject is detected**
   - If `matchSubject` returns null but the prompt still passes `TRIGGER_RE` (important / essays / short notes / exam / etc.), run a new `findSubtopicAcrossAllSubjects(cleanedQuery)`:
     - Walk every subject in `QUESTION_BANK_DATA`.
     - Reuse the existing `findSubtopicNode` scoring per subject.
     - Track the best-scoring subtopic across all subjects (require score ≥ 40, same threshold used today).
   - Build the `HighYieldIntent` using that subject + paper (inferred from the matched node's parent if it is under `paper-N`) + subtopic.

3. **Cleaned query for subtopic search**
   - Reuse the same filler-stripping logic from `extractSubtopicQuery`, but without removing a subject name (since none was given). Strip only: triggers ("important", "high yield", "tomorrow exam", "essays", "short notes", numbers), paper words, and stopwords. Leaves "disaster management", "demography", "epidemiology", etc.

4. **Examples that will work after the fix**
   - `important questions in disaster management` → Community Medicine → Disaster Management
   - `top essays demography` → Community Medicine → Demography
   - `high yield short notes shock` → Pathology / Surgery (whichever scores higher) → Shock
   - `tomorrow exam epidemiology questions` → Community Medicine → Epidemiology
   - Existing flows (with subject named, with paper, triple/double tap, normal Gemini Q&A) stay unchanged.

5. **Guardrails**
   - If multiple subjects tie, prefer the one whose subtopic name fully contains the query.
   - If no subtopic clears the score threshold, return null so the prompt falls through to Gemini (today's normal behavior), instead of returning a wrong subject.

## Files touched
- `src/lib/high-yield-query.ts` only.
- No changes to `use-ai-chat.ts`, UI, data, or any other feature.

## Verification
- `disaster management` → returns Community Medicine → Disaster Management essays + short notes.
- `ent` alone (no trigger word) → still goes to Gemini.
- `important questions community medicine paper 2` → unchanged behavior.
- `explain insulin resistance` → still goes to Gemini.
