// Guards the per-question subscription in src/lib/progress.ts.
//
// Question rows subscribe to one question each rather than to the store's
// global version. That is the difference between ticking a checkbox
// re-rendering one row and re-rendering every row mounted in the list — a
// dozen or so at the current virtualization window, each re-running its
// star and page-number parsing. On a cheap phone that is the lag between the
// tap and the tick appearing.
//
// It is an easy thing to undo by accident: swapping useQuestionDone back to
// useProgressVersion looks harmless and costs nothing visible on a fast
// device. This check fails loudly instead.
//
//   node scripts/progress-fanout-check.mjs
import { build } from 'esbuild';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

const here = path.dirname(new URL(import.meta.url).pathname);
const store = path.join(here, '..', 'src', 'lib', 'progress.ts');

// The store pulls in AsyncStorage and Supabase; neither exists off-device, and
// neither is what is being measured.
const stubs = await fs.mkdtemp(path.join(os.tmpdir(), 'orbit-fanout-'));
await fs.writeFile(
  path.join(stubs, 'async.js'),
  `export default { getItem:async()=>null, setItem:async()=>{}, removeItem:async()=>{},
     getMany:async()=>[], setMany:async()=>{}, getAllKeys:async()=>[] };`,
);
await fs.writeFile(
  path.join(stubs, 'supabase.js'),
  `export const supabase = { auth:{ getSession:async()=>({data:{session:null}}) },
     rpc:async()=>({error:null}), from:()=>({select:()=>({eq:()=>({})})}) };`,
);
await fs.writeFile(path.join(stubs, 'log.js'), 'export const warn=()=>{};export const error=()=>{};');

const bundled = await build({
  entryPoints: [store],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
  alias: {
    '@react-native-async-storage/async-storage': path.join(stubs, 'async.js'),
    '@/lib/log': path.join(stubs, 'log.js'),
  },
  plugins: [
    {
      name: 'stub-supabase',
      setup(b) {
        b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: path.join(stubs, 'supabase.js') }));
      },
    },
  ],
});

const progress = await import(
  'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
);
await fs.rm(stubs, { recursive: true, force: true });

// One virtualization window's worth of rows, each subscribed to its own
// question, plus one counter subscribed to the whole store.
const ROWS = 12;
const questions = Array.from({ length: ROWS }, (_, i) => `Question number ${i} about pathology`);

let rowRenders = 0;
let countRenders = 0;
for (const question of questions) {
  progress.subscribeQuestion(progress.getQuestionId(question), () => {
    rowRenders++;
  });
}
progress.subscribe(() => {
  countRenders++;
});

const failures = [];

// 1. Ticking one question must wake exactly that row — and still the counters.
progress.setQuestionDone(questions[3], true);
if (rowRenders !== 1) {
  failures.push(`one tick woke ${rowRenders} rows, expected 1`);
}
if (countRenders !== 1) {
  failures.push(`one tick woke ${countRenders} counters, expected 1`);
}
process.stdout.write(`one tick        rows=${rowRenders} (want 1)   counters=${countRenders} (want 1)\n`);

// 2. Hydration and cloud merges can change anything, so every row must refresh.
//    Getting this wrong is the opposite failure: rows left showing stale ticks
//    after a sign-in merge.
rowRenders = 0;
await progress.hydrateProgress();
if (rowRenders !== ROWS) {
  failures.push(`hydration woke ${rowRenders} rows, expected ${ROWS}`);
}
process.stdout.write(`hydration       rows=${rowRenders} (want ${ROWS})\n`);

if (failures.length) {
  process.stdout.write(`\nFAIL\n${failures.map(f => '  - ' + f).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nOK\n');
}
