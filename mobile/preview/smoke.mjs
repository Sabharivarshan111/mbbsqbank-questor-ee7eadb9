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
  // fault into a wall of red. Always leave the screen usable — a sheet counts
  // as well as a dialog, since its scrim blocks the header the next step needs.
  await declineAdPromptIfShown();
  await closeSheetIfOpen();
  await closeModalIfOpen();
}

/** The theme editor is a modal card, not a sheet; it closes with its X. */
async function closeModalIfOpen() {
  const close = page.locator('[aria-label="Close"]').first();
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => {});
    await page.waitForTimeout(600);
    await declineAdPromptIfShown();
    return true;
  }
  return false;
}

/**
 * Wait for a sheet to actually be gone.
 *
 * Its exit is a spring, not a fixed duration, and the scrim keeps swallowing
 * taps until it has finished. A `waitForTimeout(900)` was racing it: the theme
 * steps passed, then the next step's first tap reported "visible but blocked"
 * on a header button the closing sheet was still covering.
 */
async function waitForSheetClosed() {
  await page
    .locator('[aria-label="Done"]')
    .first()
    .waitFor({ state: 'hidden', timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(150);
}

/** Dismiss a sheet left open, so its scrim does not eat the next step. */
async function closeSheetIfOpen() {
  const done = page.locator('[aria-label="Done"]').first();
  if (await done.isVisible().catch(() => false)) {
    await done.click().catch(() => {});
    await waitForSheetClosed();
    await declineAdPromptIfShown();
    return true;
  }
  return false;
}

const byLabel = label => page.locator(`[aria-label="${label}"]`).first();
/**
 * Names the control in the failure.
 *
 * Playwright's own message is "locator.click: Timeout 4000ms exceeded", which
 * says a click failed but not which one — and a step that taps six controls
 * then gives no clue where it stopped. It also reports whether the control was
 * missing or merely unclickable, which are different bugs: absent means a
 * label changed, present-but-blocked means something is covering it.
 */
const tap = async label => {
  try {
    await byLabel(label).click({ timeout: 4000 });
  } catch (error) {
    const count = await byLabel(label).count();
    const visible = count > 0 && (await byLabel(label).isVisible().catch(() => false));
    if (process.env.SMOKE_DEBUG) {
      await page.screenshot({ path: `/tmp/smoke-fail-${label.replace(/\W+/g, '-')}.png` });
      const top = await page.evaluate(l => {
        const el = document.querySelector(`[aria-label="${l}"]`);
        if (!el) return 'missing';
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        const path = [];
        for (let n = hit; n && path.length < 5; n = n.parentElement) {
          path.push(`${n.tagName}${n.getAttribute('aria-label') ? `[${n.getAttribute('aria-label')}]` : ''}`);
        }
        return path.join(' < ');
      }, label);
      process.stdout.write(`\nDEBUG hit-test at "${label}": ${top}\n`);
    }
    const why = String(error.message).split('\n').slice(0, 3).join(' | ');
    throw new Error(
      `could not tap "${label}" (${count === 0 ? 'no such label' : visible ? 'visible' : 'hidden'}) — ${why}`,
    );
  }
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
 * Themes are an anchored menu now, matching the published app: tap the header
 * button, pick a row, the menu closes itself.
 */
async function pickTheme(label) {
  await tap('Themes');
  await tap(label);
  await page.waitForTimeout(500);
  return declineAdPromptIfShown();
}

const taglineColor = () =>
  page.evaluate(() => {
    const node = [...document.querySelectorAll('div,span')].find(
      n => n.children.length === 0 && n.textContent.trim() === 'Learn. Retain. Master.',
    );
    return node ? getComputedStyle(node).color : null;
  });

await step('theme menu switches between presets', async () => {
  await pickTheme('Light');
  const light = await taglineColor();
  await pickTheme('Dark');
  const dark = await taglineColor();
  if (!light || !dark || light === dark) {
    throw new Error(`text colour did not change between presets (${light} → ${dark})`);
  }
});

await step('Black Pink changes the accent but keeps the black base', async () => {
  /**
   * Asserted on the two things that actually distinguish it from Dark. An
   * earlier version read the same value twice and asserted they were equal,
   * which is true of any value and tested nothing.
   */
  const heroAccent = () =>
    page.evaluate(() => {
      const node = [...document.querySelectorAll('div,span')].find(
        n => n.children.length === 0 && n.textContent.trim() === 'Ask AI',
      );
      return node ? getComputedStyle(node).color : null;
    });

  await pickTheme('Dark');
  const darkAccent = await heroAccent();
  const darkText = await taglineColor();
  await pickTheme('Black Pink');
  const pinkAccent = await heroAccent();
  const pinkText = await taglineColor();

  if (!darkAccent || !pinkAccent || darkAccent === pinkAccent) {
    throw new Error(`accent did not change (${darkAccent} → ${pinkAccent})`);
  }
  if (darkText !== pinkText) {
    throw new Error(`text colour should be unchanged on a black base (${darkText} → ${pinkText})`);
  }
  await pickTheme('Dark');
});

await step('the theme editor builds and applies a theme', async () => {
  await tap('Themes');
  await tap('Create Your Own…');
  await seesText('Pick colors for your perfect look');

  // All four parts must open a picker, or this is not the editor asked for.
  for (const part of ['Background, Main page color', 'Text, Main text color', 'Accent, Buttons & highlights', 'Card, Cards & panels']) {
    await tap(part);
    await page.waitForTimeout(250);
    const picker = await page.locator('[aria-label$="colour picker"]').count();
    if (picker === 0) {
      throw new Error(`tapping "${part}" did not open a picker`);
    }
    /**
     * Dismiss by tapping the same slot again.
     *
     * Clicking the backdrop was the obvious move and closed the entire editor
     * — the popover's scrim and the modal's are both "outside the card" from a
     * click's point of view. Toggling on the slot is also what a user does.
     */
    await tap(part);
    await page.waitForTimeout(250);
  }

  // Reset has to actually restore, not just exist.
  await tap('Sunset');
  await page.waitForTimeout(300);
  const sunsetShot = await page.screenshot();
  await tap('Reset');
  await page.waitForTimeout(300);
  const resetShot = await page.screenshot();
  if (Buffer.compare(sunsetShot, resetShot) === 0) {
    throw new Error('Reset changed nothing');
  }

  await tap('Forest');
  await page.waitForTimeout(300);
  await tap('Apply Theme');
  await page.waitForTimeout(700);
  await declineAdPromptIfShown();

  // The applied theme should now be offered as My Theme.
  await tap('Themes');
  await seesText('My Theme');
  await tap('Dark');
  await page.waitForTimeout(500);
  await declineAdPromptIfShown();
});

await step('declining the ad prompt stops it re-asking on the next change', async () => {
  const askedAgain = await pickTheme('Light');
  const askedThrice = await pickTheme('Dark');
  if (askedAgain || askedThrice) {
    throw new Error('prompt returned during the decline cooldown');
  }
});

await step('text size slider resizes the app live, and snaps to 100%', async () => {
  await tap('Text size');
  await seesText('Applies across the app');

  // The sample in the sheet is real app text, so its computed size is the
  // check: a readout that says 115% while nothing grew is the bug worth
  // catching.
  const sampleSize = async () =>
    page.evaluate(() => {
      // The innermost match: react-native-web renders a Text as a div inside
      // several layout divs, and the ancestors report the document's default
      // 16px rather than the ramp's size.
      const nodes = [...document.querySelectorAll('div')].filter(el =>
        el.textContent?.startsWith('Bilirubin is conjugated'),
      );
      const node = nodes[nodes.length - 1];
      return node ? parseFloat(getComputedStyle(node).fontSize) : 0;
    });
  const readout = async () =>
    page.evaluate(() => {
      const nodes = [...document.querySelectorAll('div')].filter(el =>
        /^\d+%$/.test(el.textContent ?? ''),
      );
      return nodes[nodes.length - 1]?.textContent ?? '';
    });

  const slider = page.locator('[role="slider"]').first();
  const box = await slider.boundingBox();
  if (!box) {
    throw new Error('no slider in the text size sheet');
  }
  const before = await sampleSize();

  // Drag to the maximum.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const grown = await sampleSize();
  if (!(grown > before)) {
    throw new Error(`dragging right did not enlarge the sample (${before} → ${grown})`);
  }
  if ((await readout()) !== '115%') {
    throw new Error(`readout says ${await readout()} at the right-hand end, expected 115%`);
  }

  // Release a little short of the 100% tick: the detent is what makes the one
  // named value on the scale reachable exactly.
  const defaultX = box.x + 14 + (box.width - 28) * ((1 - 0.9) / (1.15 - 0.9));
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await page.mouse.down();
  // Far enough past the tick to round to 101% on its own, close enough that
  // the detent should reel it in. Land it on 100% by luck and this asserts
  // nothing.
  await page.mouse.move(defaultX + 14, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  if ((await readout()) !== '100%') {
    throw new Error(`released near the 100% tick and got ${await readout()}`);
  }

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
