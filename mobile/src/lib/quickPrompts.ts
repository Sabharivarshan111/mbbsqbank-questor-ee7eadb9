/**
 * The `/` commands in the Ask AI composer.
 *
 * Adapted from the reference prompt bar's slash menu. Its commands were
 * shortcuts for a business assistant; these are the things a student actually
 * asks an exam tutor for, and each one carries the wording that gets a useful
 * answer back rather than a chatty one.
 *
 * Each command *inserts* rather than sends. Every one of them needs a topic,
 * and a command that fired immediately would either have to guess one or send
 * a question with a hole in it. Inserting the framing and leaving the caret at
 * the end means the user types the one thing only they know.
 *
 * `mcqs` is the exception worth noting: it inserts the `Double-tapped:` marker,
 * which is what routes the request to the edge function's MCQ branch and comes
 * back as answerable cards rather than prose. See lib/askAi.ts.
 */

export interface QuickPrompt {
  key: string;
  /** What the user types after the slash. */
  command: string;
  label: string;
  desc: string;
  /** Placed in the composer, caret at the end. */
  insert: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    key: 'mcqs',
    command: 'mcqs',
    label: 'Practice MCQs',
    desc: '10 NEET-PG style questions, as cards',
    insert: 'Double-tapped: ',
  },
  {
    key: 'pyq',
    command: 'pyq',
    label: 'What gets asked',
    desc: 'The sub-questions examiners actually set',
    insert:
      'For this MBBS medical topic, list the sub-questions most often set in university exams and what an examiner looks for in each:\n\n',
  },
  {
    key: 'simplify',
    command: 'simplify',
    label: 'Explain simply',
    desc: 'Plain language, as if teaching a junior',
    insert: 'Explain this medical topic in simple terms, as if teaching a junior:\n\n',
  },
  {
    key: 'mnemonic',
    command: 'mnemonic',
    label: 'Mnemonic',
    desc: 'Something memorable for the list',
    insert:
      'Give me a memorable mnemonic for this medical list, then expand each letter:\n\n',
  },
  {
    key: 'compare',
    command: 'compare',
    label: 'Compare two things',
    desc: 'A side-by-side table of differences',
    insert:
      'Compare these two medical entities in a table — definition, causes, features, investigations, treatment:\n\n',
  },
  {
    key: 'case',
    command: 'case',
    label: 'Clinical case',
    desc: 'A viva-style case to work through',
    insert:
      'Give me a clinical case on this medical topic in viva style: the history and findings first, then ask me the questions an examiner would, and give the answers after:\n\n',
  },
];

/**
 * The `/word` being typed at the end of the input, if any.
 *
 * Anchored to the end and to a word boundary so a slash inside a sentence —
 * "and/or", a URL, a units expression like mg/dL — does not open the menu. The
 * reference used the same shape for the same reason.
 */
export function slashToken(text: string): { query: string; start: number } | null {
  const match = /(^|\s)\/([a-z-]*)$/i.exec(text);
  if (!match) {
    return null;
  }
  return { query: match[2].toLowerCase(), start: match.index + match[1].length };
}

/**
 * Prefix matching, on the command or on any word of the label.
 *
 * Not a substring match. `label.includes(query)` looks reasonable and is
 * useless at the length people actually type: "/m" matched "si**m**ply" and
 * "co**m**pare" as well as the two commands that start with m, which is every
 * command but one — a filter that filters nothing.
 *
 * Word-start matching means "/co" finds "Compare", and "/th" finds "Compare
 * two things", without a stray letter in the middle of a word counting.
 */
export function matchPrompts(query: string): QuickPrompt[] {
  if (!query) {
    return QUICK_PROMPTS;
  }
  return QUICK_PROMPTS.filter(
    p =>
      p.command.startsWith(query) ||
      p.label
        .toLowerCase()
        .split(/\s+/)
        .some(word => word.startsWith(query)),
  );
}
