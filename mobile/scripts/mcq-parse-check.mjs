// Guards the MCQ response parser in src/lib/askAi.ts.
//
// The edge function is asked for a bare JSON array and told twice not to wrap
// it. Models wrap it anyway — markdown fences, a "Here are your questions:"
// preamble, a trailing note — so the parser looks for the outermost bracket
// pair instead of trusting the whole string to be JSON.
//
// It also has to reject junk rather than half-render it. A quiz card with three
// options, or with "correct" pointing at an option that does not exist, is
// worse than falling back to prose: it silently teaches the wrong answer.
//
// This is the one piece of the Ask AI path that can be tested without a
// network, an API key or a device, so it is worth testing properly.
//
//   node scripts/mcq-parse-check.mjs
import { build } from 'esbuild';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

const here = path.dirname(new URL(import.meta.url).pathname);
const target = path.join(here, '..', 'src', 'lib', 'askAi.ts');

// askAi.ts imports the Supabase client for the request half. parseMcqs does not
// touch it, but the module graph has to resolve.
const stubs = await fs.mkdtemp(path.join(os.tmpdir(), 'orbit-mcq-'));
await fs.writeFile(
  path.join(stubs, 'supabase.js'),
  'export const supabase = { functions: { invoke: async () => ({ data: null, error: null }) } };',
);

const bundled = await build({
  entryPoints: [target],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
  alias: { '@/lib/supabase': path.join(stubs, 'supabase.js') },
});

const module = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);
const { parseMcqs, tripleTapPrompt, doubleTapPrompt, displayText } = module;

const good = index => ({
  topic: 'Cardiology',
  question: `Question ${index}?`,
  options: { A: 'one', B: 'two', C: 'three', D: 'four' },
  correct: 'B',
  explanation: 'Because two.',
});
const ten = JSON.stringify(Array.from({ length: 10 }, (_, i) => good(i)));

let failures = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) {
    failures += 1;
  }
  process.stdout.write(`${ok ? 'ok   ' : 'FAIL '} ${name}  (got ${actual}, want ${expected})\n`);
}

// --- shapes the model actually returns -------------------------------------
check('bare array', parseMcqs(ten)?.length, 10);
check('fenced as json', parseMcqs('```json\n' + ten + '\n```')?.length, 10);
check('fenced, no language', parseMcqs('```\n' + ten + '\n```')?.length, 10);
check('preamble before', parseMcqs(`Here are your questions:\n${ten}`)?.length, 10);
check('note after', parseMcqs(`${ten}\n\nGood luck!`)?.length, 10);
check('both sides', parseMcqs(`Sure!\n${ten}\nHope that helps.`)?.length, 10);

// --- things that must NOT become cards -------------------------------------
check('prose only', parseMcqs('1. What is the commonest cause of X? A) foo'), undefined);
check('empty string', parseMcqs(''), undefined);
check('truncated json', parseMcqs(ten.slice(0, ten.length / 2)), undefined);
check('not an array', parseMcqs('{"question":"x"}'), undefined);
check('empty array', parseMcqs('[]'), undefined);

// A single malformed item is dropped; the valid ones still render.
const mixed = JSON.stringify([
  good(0),
  { question: 'no options' },
  { ...good(1), options: { A: 'a', B: 'b', C: 'c' } }, // missing D
  { ...good(2), correct: 'E' }, // out of range
  good(3),
]);
check('drops malformed items, keeps valid', parseMcqs(mixed)?.length, 2);

// Every surviving item must be renderable: 4 options and an in-range answer.
const parsed = parseMcqs(mixed) ?? [];
const allRenderable = parsed.every(
  item =>
    ['A', 'B', 'C', 'D'].every(letter => typeof item.options[letter] === 'string') &&
    ['A', 'B', 'C', 'D'].includes(item.correct),
);
check('survivors are all renderable', allRenderable, true);

// --- the markers the edge function keys off --------------------------------
check('triple tap marked', tripleTapPrompt('Discuss jaundice').startsWith('Triple-tapped:'), true);
check('double tap marked', doubleTapPrompt('Jaundice').startsWith('Double-tapped:'), true);
// The medical/generic system-prompt branch is chosen by keyword match on the
// prompt (ask-gemini/index.ts line 363). Losing the word loses the branch.
check('triple tap hits medical branch', /medical/i.test(tripleTapPrompt('Discuss jaundice')), true);
// Markers are machinery; the user must never see them in a bubble.
check('marker stripped for display', displayText(doubleTapPrompt('Jaundice')), 'Jaundice');
check(
  'triple marker stripped for display',
  displayText('Triple-tapped: Discuss jaundice'),
  'Discuss jaundice',
);

await fs.rm(stubs, { recursive: true, force: true });

process.stdout.write(failures === 0 ? '\nOK\n' : `\n${failures} FAILED\n`);
process.exitCode = failures === 0 ? 0 : 1;
