// Checks the real question bank against the generate-handwritten-notes limits.
//
// That function validates its body with zod and answers a violation with a
// hard 400 (supabase/functions/generate-handwritten-notes/index.ts:296) — not a
// soft failure the client can recover from. Two of its limits are bounded by
// data rather than by anything the client controls:
//
//   questions: z.array(z.string().max(1000)).min(1).max(400)
//
// So one oversized subtopic anywhere in ~750KB of question bank makes Notes
// permanently broken for that topic, with no symptom anywhere else. That is
// exactly the kind of thing nobody finds by tapping around, because you have to
// tap the *one* topic that is too big.
//
// This walks every subtopic in every year and reports the worst case.
//
//   node scripts/notes-limits-check.mjs
import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs/promises';

const here = path.dirname(new URL(import.meta.url).pathname);
const bank = path.join(here, '..', 'src', 'lib', 'questionBank.ts');
const limits = path.join(here, '..', 'src', 'lib', 'notesLimits.ts');

const bundled = await build({
  entryPoints: [bank],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
  absWorkingDir: path.join(here, '..'),
  // The @data alias points at the shared question bank; resolve it the same way
  // metro.config.js and tsconfig.json do.
  alias: {
    '@data': path.join(here, '..', '..', 'src', 'data'),
    '@shared': path.join(here, '..', '..', 'src', 'lib'),
    '@': path.join(here, '..', 'src'),
  },
});

const mod = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);

// The clamp under test, and the limits, come from the client itself rather than
// being restated here — a copy would drift from the code it is guarding.
// notesLimits.ts has no imports precisely so this can load it directly.
const limitsBundle = await build({
  entryPoints: [limits],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
});
const { clampQuestions, MAX_QUESTIONS, MAX_QUESTION_CHARS } = await import(
  `data:text/javascript;base64,${Buffer.from(limitsBundle.outputFiles[0].text).toString('base64')}`
);

// Walk whatever tree shape the bank exposes, collecting every node that carries
// its own questions — that is what a Notes request is built from.
const groups = [];
function walk(node, trail) {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (Array.isArray(node)) {
    node.forEach(child => walk(child, trail));
    return;
  }
  const name = node.name ?? node.title ?? node.key;
  const here_ = name ? [...trail, String(name)] : trail;
  if (Array.isArray(node.questions) && node.questions.length > 0) {
    groups.push({ path: here_.join(' → '), questions: node.questions.filter(q => typeof q === 'string') });
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      walk(value, here_);
    }
  }
}

const roots = Object.values(mod).filter(v => v && typeof v === 'object');
roots.forEach(root => walk(root, []));

if (groups.length === 0) {
  process.stdout.write('Found no question groups — the bank shape changed.\n');
  process.exitCode = 1;
} else {
  const biggest = groups.reduce((a, b) => (b.questions.length > a.questions.length ? b : a));
  const longest = groups
    .flatMap(g => g.questions.map(q => ({ path: g.path, len: q.length })))
    .reduce((a, b) => (b.len > a.len ? b : a));

  const rawOverCount = groups.filter(g => g.questions.length > MAX_QUESTIONS);
  const rawOverChars = groups.flatMap(g =>
    g.questions.filter(q => q.length > MAX_QUESTION_CHARS).map(q => ({ path: g.path, len: q.length })),
  );

  process.stdout.write(`groups scanned          ${groups.length}\n`);
  process.stdout.write(
    `largest group           ${biggest.questions.length} questions (limit ${MAX_QUESTIONS}) — ${biggest.path}\n`,
  );
  process.stdout.write(
    `longest raw question    ${longest.len} chars (limit ${MAX_QUESTION_CHARS}) — ${longest.path}\n`,
  );
  process.stdout.write(
    `raw questions over      ${rawOverChars.length}${
      rawOverChars.length ? ' (these are why clampQuestions exists)' : ''
    }\n`,
  );
  for (const q of rawOverChars) {
    process.stdout.write(`  over by ${q.len - MAX_QUESTION_CHARS} chars — ${q.path}\n`);
  }

  // The point of the check: what the client actually SENDS must be inside the
  // limits, for every group in the bank. Reporting the raw data is context;
  // this is the assertion.
  const failures = [];
  for (const g of groups) {
    const sent = clampQuestions(g.questions);
    if (sent.length > MAX_QUESTIONS) {
      failures.push(`${g.path}: sends ${sent.length} questions`);
    }
    if (sent.length < 1) {
      failures.push(`${g.path}: sends an empty array, which the schema rejects`);
    }
    for (const q of sent) {
      if (q.length > MAX_QUESTION_CHARS) {
        failures.push(`${g.path}: sends a ${q.length}-char question`);
      }
    }
  }

  // A clamp that keeps the tail instead of the head would still pass the length
  // assertion while silently emptying the PYQ year badges, so check the markers
  // survive too.
  for (const q of rawOverChars.slice(0, 1)) {
    const group = groups.find(g => g.path === q.path);
    const original = group.questions.find(s => s.length > MAX_QUESTION_CHARS);
    const clamped = clampQuestions([original])[0];
    if (!original.startsWith(clamped.slice(0, 40))) {
      failures.push(`${q.path}: clamp did not keep the head of the question`);
    }
  }

  if (rawOverCount.length) {
    process.stdout.write(`\nNote: ${rawOverCount.length} group(s) exceed ${MAX_QUESTIONS} questions and get truncated.\n`);
  }

  process.stdout.write(`\nwhat the client sends   ${failures.length === 0 ? 'all within limits' : ''}\n`);
  for (const f of failures) {
    process.stdout.write(`FAIL ${f}\n`);
  }

  process.stdout.write(failures.length === 0 ? '\nOK\n' : `\n${failures.length} FAILED\n`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

// Print the offenders in full when run with --show, so a long question can be
// eyeballed rather than trusted to a character count.
if (process.argv.includes('--show')) {
  for (const g of groups) {
    for (const q of g.questions) {
      if (q.length > MAX_QUESTION_CHARS) {
        process.stdout.write(`\n--- ${g.path} (${q.length} chars) ---\n${q}\n`);
      }
    }
  }
}
