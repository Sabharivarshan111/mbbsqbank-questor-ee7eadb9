/**
 * Question strings carry importance markers and page references inline.
 * These helpers match src/components/QuestionCard.tsx so the native app
 * renders the same badges the web app does.
 */

const STAR_PATTERN = /[*★☆⭐]/g;
const DATE_PATTERN =
  /\(((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{2,4}[,;]?\s*)+)\)/i;
const PAGE_PATTERN = /\((?:Pg\.No|Page No):\s*(\d+)(?:;AP3-Pg\.No:\s*\d+)?\)/i;

/** How many times this question has been asked, per the source markers. */
export function countStars(question: string): number {
  const stars = question.match(STAR_PATTERN);
  if (stars && stars.length > 0) {
    return stars.length;
  }
  const dateMatch = question.match(DATE_PATTERN);
  if (dateMatch && dateMatch[1]) {
    return dateMatch[1]
      .split(/[;,]/)
      .map(part => part.trim())
      .filter(Boolean).length;
  }
  return 0;
}

export function extractPageNumber(question: string): string | null {
  const match = question.match(PAGE_PATTERN);
  return match && match[1] ? match[1] : null;
}

/** Body text with the trailing markers stripped, for display and for the AI. */
export function getCleanQuestionText(question: string): string {
  return question
    .replace(/^\d+\.\s/, '')
    .replace(STAR_PATTERN, '')
    .replace(/\((?:Pg\.No|Page No):[^)]*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Bucket used to colour the importance badge. */
export function importanceLabel(stars: number): 'must-know' | 'important' | 'seen' | null {
  if (stars >= 5) {
    return 'must-know';
  }
  if (stars >= 3) {
    return 'important';
  }
  if (stars >= 1) {
    return 'seen';
  }
  return null;
}
