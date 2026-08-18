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

/**
 * Mode now lives in the Appearance sheet rather than on a header button that
 * toggled on tap. Opening it each time is what a user does too — the sheet is
 * the control, and there is no longer a one-tap toggle to shortcut through.
 */
async function setMode(label) {
  await tap('Appearance');
  await seesText('Mode');
  await tap(label);
  await declineAdPromptIfShown();
  await tap('Done');
  await page.waitForTimeout(900);
  return declineAdPromptIfShown();
}

await step('appearance sheet switches dark → light → dark', async () => {
  /**
   * Probed on themed *text*, not on document.body.
   *
   * react-native-web paints its own colour on the body — rgb(11, 10, 20),
   * which is neither palette — so reading it reported "no change" for a switch
   * that had plainly worked. A tagline rendered in colors.text flips from
   * near-white to near-black and is unambiguous.
   */
  const taglineColor = () =>
    page.evaluate(() => {
      const node = [...document.querySelectorAll('div,span')].find(
        n => n.children.length === 0 && n.textContent.trim() === 'Learn. Retain. Master.',
      );
      return node ? getComputedStyle(node).color : null;
    });

  await setMode('Light');
  const light = await taglineColor();
  await setMode('Dark');
  const dark = await taglineColor();
  if (!light || !dark || light === dark) {
    throw new Error(`text colour did not change between modes (${light} → ${dark})`);
  }
});

await step('choosing an accent recolours the app', async () => {
  await tap('Appearance');
  await seesText('Accent');
  await tap('Emerald');
  await page.waitForTimeout(400);
  // The preview badge is drawn in the accent, so it is the cheapest honest
  // probe that the palette actually rebuilt.
  const green = await page.evaluate(() => {
    const badge = [...document.querySelectorAll('div,span')].find(
      n => n.children.length === 0 && n.textContent.trim() === 'Badge',
    );
    return badge ? getComputedStyle(badge).color : null;
  });
  await tap('Fuchsia');
  await page.waitForTimeout(400);
  const pink = await page.evaluate(() => {
    const badge = [...document.querySelectorAll('div,span')].find(
      n => n.children.length === 0 && n.textContent.trim() === 'Badge',
    );
    return badge ? getComputedStyle(badge).color : null;
  });
  await tap('Done');
  await page.waitForTimeout(900);
  await declineAdPromptIfShown();
  if (!green || !pink || green === pink) {
    throw new Error(`accent did not change the palette (${green} → ${pink})`);
  }
});

await step('declining the ad prompt stops it re-asking on the next change', async () => {
  // The change above was declined, which starts a cooldown. Being asked again
  // seconds later is nagging, and was the behaviour before that cooldown
  // existed — two changes were enough to be asked twice.
  const askedAgain = await setMode('Light');
  const askedThrice = await setMode('Dark');
  if (askedAgain || askedThrice) {
    throw new Error('prompt returned during the decline cooldown');
  }
});

await step('text size sheet opens, applies Larger, and closes', async () => {
  await tap('Text size');
  await seesText('Applies across the app');
  await tap('Larger');
  await tap('Done');
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

  // The checkbox is its own control now — the row itself counts taps for
  // MCQs (2) and the written answer (3), matching the published app.
  const box = page.locator('[role="checkbox"]').first();
  await box.waitFor({ timeout: 5000 });
  const row = page.locator('[aria-label][role="button"]').filter({ has: box }).first();

  /**
   * Asserted on the strikethrough, not on aria-checked.
   *
   * The row does set `accessibilityState={{ checked }}`, which React Native
   * maps to TalkBack's checked state on Android — but react-native-web does
   * not mirror it to `aria-checked`, so it reads as null here. That is a gap
   * in the harness, not in the app, and it is not worth contorting app code to
   * satisfy a shim. The line-through is the same state, rendered.
   */
  const rowText = page.locator('[role="checkbox"]').first().locator('xpath=../../..');
  const struck = () =>
    rowText.evaluate(node =>
      [...node.querySelectorAll('*')].some(child =>
        getComputedStyle(child).textDecorationLine.includes('line-through'),
      ),
    );

  const before = await struck();
  await box.click();
  await page.waitForTimeout(500);
  if ((await struck()) === before) {
    throw new Error(`tapping the checkbox did not change its done state (stayed ${before})`);
  }
  await box.click();
  await page.waitForTimeout(500);
  if ((await struck()) !== before) {
    throw new Error('second tap did not restore the original state');
  }
});

await step('double tap a question opens Ask AI with the question text', async () => {
  // Same three levels as the step above. Re-navigating rather than reusing the
  // previous position keeps this step independent — a failure there should not
  // turn into a confusing failure here.
  await open('screen=browse&year=second-year&node=pathology&title=Pathology');
  await page.getByText('Explore Questions').first().click({ timeout: 5000 });
  await page.waitForTimeout(800);
  await page.locator('[aria-label^="The Cell as a Unit"]').first().click({ timeout: 5000 });
  await page.waitForTimeout(900);
  await declineAdPromptIfShown();
  if (await page.getByText('No essays here').first().isVisible().catch(() => false)) {
    await page.getByText('Short Notes').first().click({ timeout: 4000 });
    await page.waitForTimeout(700);
  }

  const box = page.locator('[role="checkbox"]').first();
  await box.waitFor({ timeout: 5000 });
  const row = page.locator('[aria-label][role="button"]').filter({ has: box }).first();
  const question = (await row.getAttribute('aria-label')) ?? '';

  // Two taps inside the 280ms window. Driven through page.mouse with
  // clickCount rather than two awaited .click() calls, because each awaited
  // click costs more than the window and the second would start a new count.
  const point = await row.boundingBox();
  await page.mouse.click(point.x + point.width / 2, point.y + 12, { clickCount: 2, delay: 40 });

  // The request itself cannot succeed here — the sandbox blocks Supabase — so
  // this asserts the routing and the prompt, which is what the change touched.
  // The failure bubble that follows is expected and is not what is checked.
  //
  // Keyed on the composer, not on the text "Ask AI": that string is also the
  // bottom-nav tab label, so it is already on screen before the tap and would
  // make this pass without ever navigating anywhere.
  await page
    .locator('[placeholder="Ask a medical question…"]')
    .waitFor({ state: 'visible', timeout: 6000 });

  // Only what is actually visible. React Navigation keeps the screens you came
  // from mounted, so reading every text node would also read the browse screens
  // still sitting behind this one.
  const shown = await page.evaluate(() =>
    [...document.querySelectorAll('div,span')]
      .filter(node => node.children.length === 0 && node.textContent.trim() && node.offsetParent)
      .map(node => node.textContent.trim()),
  );
  const joined = shown.join('   ');

  // The markers are machinery for the edge function; a user must never see one.
  if (/Triple-tapped:|Double-tapped:/.test(joined)) {
    throw new Error('a tap marker leaked into the transcript');
  }
  // Nor the JSON-forcing MCQ instructions that replace the prompt on the wire.
  if (/RESPOND WITH ONLY A VALID JSON ARRAY/.test(joined)) {
    throw new Error('the raw MCQ prompt was shown instead of the question');
  }
  // The question itself should be there. Compared on the leading words before
  // any bracket — the label carries PYQ markers ("Growth Factors (Feb 15;Feb
  // 08)") and comparing a punctuation-stripped stem against unstripped screen
  // text never matches.
  const stem = question.split('(')[0].trim();
  if (stem && !joined.includes(stem)) {
    throw new Error(`the question ("${stem}") did not reach the Ask AI transcript`);
  }
});

await step('in-topic filter narrows the list and keeps question numbers', async () => {
  // Straight to the largest topic in the bank — 67 short notes, 15 essays —
  // because the field only appears above a list long enough to need it.
  await open(
    'screen=browse&year=second-year&node=pharmacology,paper-2,anti-microbial-drugs&title=Anti-Microbial%20Drugs',
  );
  await declineAdPromptIfShown();

  const field = page.locator('[placeholder^="Filter"]');
  await field.waitFor({ state: 'visible', timeout: 5000 });

  const numbers = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll('div,span')]
        .filter(n => n.children.length === 0 && /^\d+\./.test(n.textContent.trim()) && n.offsetParent)
        .map(n => Number(n.textContent.trim().split('.')[0])),
    );

  /**
   * Narrowing is asserted on the "N of M" counter, not on how many rows are on
   * screen. The list is virtualized, so the visible row count is whatever the
   * window happens to be rendering — comparing those two numbers had the test
   * reporting "13 → 14" for a filter that genuinely cut 15 rows to 10.
   */
  const counter = async () => {
    const text = await page.evaluate(() => {
      const hit = [...document.querySelectorAll('div,span')].find(
        n => n.children.length === 0 && /^\d+ of \d+$/.test(n.textContent.trim()) && n.offsetParent,
      );
      return hit ? hit.textContent.trim() : null;
    });
    return text;
  };

  const before = await numbers();
  if (before.length < 10) {
    throw new Error(`expected a long list, saw ${before.length} rows`);
  }

  // 10 of the 15 essays contain "anti", at positions 1-6, 10-12 and 15.
  await field.fill('anti');
  await page.waitForTimeout(500);
  if ((await counter()) !== '10 of 15') {
    throw new Error(`filter counter read "${await counter()}", expected "10 of 15"`);
  }

  /**
   * The number on a row is its position in the topic, not its position in the
   * filtered list — renumbering 1..n would mean "question 2" named a different
   * question depending on what was typed.
   *
   * Asserted as "strictly ascending, with at least one gap", which is what
   * preserved positions look like once a filter has skipped something. An
   * earlier version only checked that the first two rows were not 1 and 2;
   * giving every row the same index slipped straight past that, because then
   * no two consecutive rows read 1 and 2 either.
   */
  const after = await numbers();
  const ascending = after.every((n, i) => i === 0 || n > after[i - 1]);
  const hasGap = after.some((n, i) => i > 0 && n !== after[i - 1] + 1);
  if (!ascending) {
    throw new Error(`row numbers are not ascending after filtering: ${after.join(',')}`);
  }
  if (!hasGap) {
    throw new Error(`row numbers were renumbered 1..n by the filter: ${after.join(',')}`);
  }

  // A filtered list with no matches must not tell the user to switch tabs.
  await field.fill('zzzznope');
  await page.waitForTimeout(500);
  await page.getByText('No matches').first().waitFor({ state: 'visible', timeout: 4000 });
  if (await page.getByText('Switch the tab above').first().isVisible().catch(() => false)) {
    throw new Error('showed the wrong-tab empty state for a filter with no matches');
  }

  // Clearing restores everything.
  await page.locator('[aria-label="Clear filter"]').first().click();
  await page.waitForTimeout(500);
  // With no query there is nothing to count, so the counter goes away and the
  // full list is back.
  if ((await counter()) !== null) {
    throw new Error('the filter counter is still showing after clearing');
  }
  if ((await numbers()).length < 10) {
    throw new Error('clearing did not restore the full list');
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
