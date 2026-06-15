import React from 'react';

// Parses [[cat:term]] tags in a text string and returns an array of React nodes
// with the matched terms wrapped in colored, bold spans.

const CATEGORY_CLASS: Record<string, string> = {
  dis: 'font-semibold text-medical-disease',
  drug: 'font-semibold text-medical-drug',
  anat: 'font-semibold text-medical-anat',
  inv: 'font-semibold text-medical-inv',
  val: 'font-semibold text-medical-value',
};

const TAG_RE = /\[\[(dis|drug|anat|inv|val):([^\]]+)\]\]/g;

export function renderMedicalText(input: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(input)) !== null) {
    if (match.index > last) {
      nodes.push(input.slice(last, match.index));
    }
    const cat = match[1];
    const term = match[2];
    nodes.push(
      React.createElement(
        'span',
        { key: `m-${i++}`, className: CATEGORY_CLASS[cat] || 'font-semibold' },
        term
      )
    );
    last = match.index + match[0].length;
  }
  if (last < input.length) {
    nodes.push(input.slice(last));
  }
  return nodes.length > 0 ? nodes : [input];
}

// Strip all [[cat:term]] tags to plain term text — used for copy, MCQ parsing, etc.
export function stripMedicalTags(input: string): string {
  return input.replace(TAG_RE, (_m, _c, term) => term);
}

// Extract terms from tags in priority order (anat, dis, inv first), de-duplicated.
export function extractMedicalTerms(input: string, max = 3): string[] {
  const priority = ['anat', 'dis', 'inv', 'drug', 'val'];
  const buckets: Record<string, string[]> = { anat: [], dis: [], inv: [], drug: [], val: [] };
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(input)) !== null) {
    const cat = m[1];
    const term = m[2].trim();
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (buckets[cat]) buckets[cat].push(term);
  }
  const out: string[] = [];
  for (const cat of priority) {
    for (const t of buckets[cat]) {
      if (out.length >= max) return out;
      out.push(t);
    }
  }
  return out;
}
