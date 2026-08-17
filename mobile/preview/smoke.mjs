// Functional smoke test: drives the real screens and asserts nothing breaks.
//
// The screenshot harness only proves a screen renders. This one *uses* the app
// — toggles the theme, opens sheets, picks a year, searches, ticks a question,
// starts the timer, visits every tab — and fails if any of it throws or stops
// responding.
//
// It selects controls by their accessibility label, which means it doubles as a
// check that those labels exist and are meaningful. A control this script
// cannot find is a control TalkBack cannot announce.
//
// It is still react-native-web, not a device: it verifies wiring and state, not
// native rendering, gesture physics or animation timing.
//
//   node preview/smoke.mjs
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const here = path.dirname(fileURLToPath(import.meta.url));

// Noise that is expected in this environment and is not an app fault: the
// sandbox blocks Supabase, and react-native-web forwards a `collapsable` prop
// React does not recognise.
const EXPECTED = [
  /ERR_TUNNEL_CONNECTION_FAILED/,
  /Failed to load resource/,
  /non-boolean attribute/,
  /collapsable/,
  /Failed to fetch/,
  /supabase/i,
];

const server = await createServer({
  configFile: path.join(here, 'vite.config.ts'),
  server: { port: 5202, strictPort: true },
  logLevel: 'error',
});
await server.listen();

const [chromeDir] = (await fs.readdir('/opt/pw-browsers'))
  .filter(entry => entry.startsWith('chromium-'))
  .sort()
  .reverse();
const browser = await chromium.launch({
  executablePath: `/opt/pw-browsers/${chromeDir}/chrome-linux/chrome`,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

const crashes = [];
page.on('pageerror', error => crashes.push(`uncaught: ${error.message}`));
page.on('console', message => {
  if (message.type() !== 'error') {
    return;
  }
  const text = message.text();
  if (!EXPECTED.some(rx => rx.test(text))) {
    crashes.push(`console.error: ${text.slice(0, 160)}`);
  }
});

const results = [];
let failed = 0;

async function step(name, fn) {
  try {
    await fn();
    results.push(['ok  ', name]);
  } catch (error) {
    failed++;
    results.push(['FAIL', `${name} — ${String(error.message).split('\n')[0].slice(0, 110)}`]);
  }
  // A step that failed mid-dialog would block every step after it, turning one
  // fault into a wall of red. Always leave the screen usable.
  await declineAdPromptIfShown();
}

const byLabel = label => page.locator(`[aria-label="${label}"]`).first();
const tap = async label => {
  await byLabel(label).click({ timeout: 4000 });
  await page.waitForTimeout(280);
};
const seesText = async (text, timeout = 4000) => {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
};

/**
 * Changing the theme asks to play the day's rewarded ad, and that dialog's
 * scrim covers the screen until it is answered — so anything driving the app
 * has to answer it, exactly as a user would. This is designed behaviour ported
 * from the web app, not a defect; the test simply declines.
 */
async function declineAdPromptIfShown() {
  const notNow = page.locator('[aria-label="Not now"]').first();
  if (await notNow.isVisible().catch(() => false)) {
    await notNow.click();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function open(query) {
  await page.goto(`http://localhost:5202/?${query}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
}

// ---- Home -----------------------------------------------------------------
await open('screen=home');

await step('home renders the subject grid', () => seesText('Your Subjects'));

await step('theme toggle flips dark → light → dark', async () => {
  await tap('Switch to light theme');
  await declineAdPromptIfShown();
  await byLabel('Switch to dark theme').waitFor({ timeout: 4000 });
  await tap('Switch to dark theme');
  await declineAdPromptIfShown();
  await byLabel('Switch to light theme').waitFor({ timeout: 4000 });
});

await step('declining the ad prompt stops it re-asking on the next change', async () => {
  // The toggle above was declined, which starts a cooldown. Being asked again
  // seconds later is nagging, and was the behaviour before that cooldown
  // existed — two toggles were enough to be asked twice.
  await tap('Switch to light theme');
  const askedAgain = await declineAdPromptIfShown();
  await tap('Switch to dark theme');
  const askedThrice = await declineAdPromptIfShown();
  if (askedAgain || askedThrice) {
    throw new Error('prompt returned during the decline cooldown');
  }
});

await step('text size sheet opens, applies Larger, and closes', async () => {
  await tap('Text size');
  await seesText('Applies across the app');
  await tap('Larger');
  await tap('Close');
  // The exit is a spring, not a fixed duration — give it room to settle.
  await page.waitForTimeout(1200);
  if (await page.getByText('Applies across the app').first().isVisible().catch(() => false)) {
    throw new Error('sheet did not dismiss');
  }
});

await step('year picker opens and browses a year', async () => {
  await tap('View all years');
  await seesText('Choose the year you want to browse');
  await tap('1st Year');
  await tap('Browse 1st Year');
  await seesText('Question Bank');
});

// ---- Browse + search ------------------------------------------------------
await step('search returns matching questions', async () => {
  await open('screen=browse');
  const before = await page.locator('body').innerText();
  await page.locator('input').first().fill('cell');
  // 220ms debounce, plus the one-off search-index build on first use.
  await page.waitForTimeout(1500);
  const after = await page.locator('body').innerText();
  if (after === before) {
    throw new Error('typing a query changed nothing on screen');
  }
  if (!/cell/i.test(after)) {
    throw new Error('results do not contain the query term');
  }
});

// ---- Question list: ticking ------------------------------------------------
await step('a question row toggles done and back', async () => {
  // Pathology → Explore Questions → a topic → the question list. Three levels;
  // the checkboxes only exist at the last one.
  await open('screen=browse&year=second-year&node=pathology&title=Pathology');
  await page.getByText('Explore Questions').first().click({ timeout: 5000 });
  await page.waitForTimeout(800);
  // By label, not by text: the visible Text sits inside the pressable, and the
  // label is what a screen reader would use to get here too.
  await page.locator('[aria-label^="The Cell as a Unit"]').first().click({ timeout: 5000 });
  await page.waitForTimeout(900);
  // Opening a topic spends the "questions" bucket's daily ad, so the prompt
  // appears here too and has to be answered before anything is reachable.
  await declineAdPromptIfShown();

  // A topic can hold essays, short notes, or only one of the two — this one
  // has no essays at all, and lands on its empty state. Switch tabs when that
  // happens rather than assuming.
  if (await page.getByText('No essays here').first().isVisible().catch(() => false)) {
    await page.getByText('Short Notes').first().click({ timeout: 4000 });
    await page.waitForTimeout(700);
  }

  const row = page.locator('[role="checkbox"]').first();
  await row.waitFor({ timeout: 5000 });

  /**
   * Asserted on the strikethrough, not on aria-checked.
   *
   * The row does set `accessibilityState={{ checked }}`, which React Native
   * maps to TalkBack's checked state on Android — but react-native-web does
   * not mirror it to `aria-checked`, so it reads as null here. That is a gap
   * in the harness, not in the app, and it is not worth contorting app code to
   * satisfy a shim. The line-through is the same state, rendered.
   */
  const struck = () =>
    row.evaluate(node =>
      [...node.querySelectorAll('*')].some(child =>
        getComputedStyle(child).textDecorationLine.includes('line-through'),
      ),
    );

  const before = await struck();
  await row.click();
  await page.waitForTimeout(500);
  if ((await struck()) === before) {
    throw new Error(`tapping the row did not change its done state (stayed ${before})`);
  }
  await row.click();
  await page.waitForTimeout(500);
  if ((await struck()) !== before) {
    throw new Error('second tap did not restore the original state');
  }
});

// ---- Timer -----------------------------------------------------------------
await step('timer starts, pauses, resets, and opens its sheet', async () => {
  await open('screen=timer');
  await seesText('Focus Timer');
  await tap('Start timer');
  await byLabel('Pause timer').waitFor({ timeout: 4000 });
  await tap('Pause timer');
  await byLabel('Start timer').waitFor({ timeout: 4000 });
  await tap('Reset timer');
  await tap('Timer settings');
  await seesText('Focus length');
  await tap('45 minutes');
  await page.waitForTimeout(400);
  await seesText('45:00');
});

// ---- The other tabs --------------------------------------------------------
await step('notes screen renders its year picker', async () => {
  await open('screen=notes');
  await seesText('SELECT YEAR');
});

await step('ask ai screen renders and accepts input', async () => {
  await open('screen=askai');
  const box = page.locator('textarea, input').first();
  await box.fill('What is myocardial infarction?');
  await byLabel('Send').waitFor({ timeout: 4000 });
});

await step('progress screen renders', async () => {
  await open('screen=progress');
  await seesText('YOUR YEAR', 6000);
});

// ---- Report ----------------------------------------------------------------
await browser.close();
await server.close();

process.stdout.write('\n');
for (const [status, name] of results) {
  process.stdout.write(`  ${status}  ${name}\n`);
}

if (crashes.length) {
  process.stdout.write(`\n  ${crashes.length} runtime error(s):\n`);
  for (const crash of [...new Set(crashes)].slice(0, 10)) {
    process.stdout.write(`    - ${crash}\n`);
  }
}

const bad = failed + crashes.length;
process.stdout.write(bad ? `\nFAIL (${failed} step(s), ${crashes.length} runtime error(s))\n` : '\nOK\n');
process.exitCode = bad ? 1 : 0;
