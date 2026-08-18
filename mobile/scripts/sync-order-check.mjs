// Guards the moment progress gets pushed to the cloud.
//
// The ordering here is worth a check because getting it wrong is completely
// silent. Three facts have to line up:
//
//   1. record_questions_done starts with `IF _year IS NULL THEN RETURN 0`, so
//      it needs the caller's profile row to already exist. A push before that
//      returns 0 and reports no error.
//   2. Anonymous sign-in happens inside saveProfile and nowhere else. On a
//      fresh install there is no session at launch at all.
//   3. So App.tsx's launch-time reconcileProgress() legitimately does nothing
//      on a first run, and something has to run it again once the profile is
//      saved — otherwise everything ticked before onboarding stays on device.
//
// This asserts the retry exists and is gated on the cloud profile, not merely
// on saveProfile returning.
//
//   node scripts/sync-order-check.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const read = f => fs.readFile(path.join(here, '..', f), 'utf8');

const failures = [];
const check = (name, ok) => {
  process.stdout.write(`${ok ? 'ok   ' : 'FAIL '} ${name}\n`);
  if (!ok) failures.push(name);
};

/**
 * Comments are stripped before anything is matched.
 *
 * The first version of this check passed while the call it was guarding was
 * deleted: the doc comment next to that call also contains the word
 * "reconcileProgress()", so the regex matched the explanation instead of the
 * code. A check that its own documentation can satisfy is worse than no check.
 */
const code = text =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const useProfile = code(await read('src/hooks/useProfile.ts'));
const progress = code(await read('src/lib/progress.ts'));
const app = code(await read('App.tsx'));

check('App.tsx still reconciles at launch', /reconcileProgress\(\)/.test(app));

// The retry, and the gate it sits behind.
const saveBody = useProfile.slice(
  useProfile.indexOf('const save = useCallback'),
  useProfile.indexOf('const setYear'),
);
check('saving a profile reconciles progress', /reconcileProgress\(\)/.test(saveBody));
check(
  'the reconcile is inside the `if (cloud)` gate',
  /if \(cloud\) \{[\s\S]*reconcileProgress\(\)[\s\S]*?\n {4}\}/.test(saveBody),
);

// setYear routes through save, so it inherits the retry rather than needing
// its own. If that ever stops being true this check should be revisited.
check('setYear still routes through save', /await save\(\{ \.\.\.base, year \}\)/.test(useProfile));

// The push must stay non-destructive and chunked; a pull that deleted rows
// would turn a sync into data loss on a device that is merely behind.
check('pull only ever adds, never removes', !/doneIds\.delete/.test(
    progress.slice(progress.indexOf('pullProgressFromCloud')),
  ));
check('push is chunked', /const CHUNK = \d+/.test(progress));
check(
  'reconcile pulls before it pushes',
  progress.indexOf('await pullProgressFromCloud();\n  await pushProgressToCloud();') > -1,
);

process.stdout.write(failures.length ? `\n${failures.length} FAILED\n` : '\nOK\n');
process.exitCode = failures.length ? 1 : 0;
