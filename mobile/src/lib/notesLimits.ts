/**
 * The limits `generate-handwritten-notes` enforces, and the clamp that keeps
 * requests inside them.
 *
 * Deliberately its own module with no imports: `scripts/notes-limits-check.mjs`
 * runs this against the whole question bank off-device, and pulling it out of
 * handwrittenNotes.ts would drag in React Native and the Supabase client with
 * it. A pure function is also the only kind worth testing here.
 */

/**
 * Mirrors the edge function's zod schema:
 *
 *   questions: z.array(z.string().max(1000)).min(1).max(400)
 *
 * A violation is answered with a hard 400 for the *whole request*, not a
 * dropped item — so one oversized question breaks Notes for its entire topic.
 * Three questions in the shipped bank are over: Pharmacology → CNS (1463
 * chars), Pathology → Heart (1477) and General Medicine → Cardiology (1061).
 * They are legitimate multi-part essay questions with a "Probable Cases" list
 * appended, not corrupt data, so the fix belongs here rather than in the bank.
 */
export const MAX_QUESTION_CHARS = 1000;
export const MAX_QUESTIONS = 400;

/**
 * Clamps to what the function accepts, keeping the head of each question.
 *
 * Head-first matters: the importance stars and PYQ year markers sit at the
 * *start* of a question string ("Myocardial Infarction ******** (Feb 23;Aug
 * 22;…)"), and the model reads them to fill `pyqYears` in the response.
 * Trimming from the front to fit would silently empty the year badges.
 */
export function clampQuestions(questions: string[]): string[] {
  return questions
    .slice(0, MAX_QUESTIONS)
    .map(question =>
      question.length > MAX_QUESTION_CHARS
        ? `${question.slice(0, MAX_QUESTION_CHARS - 1)}…`
        : question,
    );
}
