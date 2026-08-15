// Dev-only screenshot harness.
//
// Renders the React Native screens through react-native-web (see
// preview/main.tsx) and captures them at handset size, so UI work can be
// reviewed without an emulator.
//
// This is NOT a device. It shares the app's components and styles, but not its
// native rendering — text metrics, shadows, ripples and gesture handling all
// differ. Treat what it produces as a layout check, never as proof that
// something works on a phone.
//
//   node preview/shoot.mjs [outDir]
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] ?? path.join(here, '..', '..', 'screenshots'));

const SHOTS = [
  { name: 'home', query: 'screen=home' },
  // Long screens need their tail checked too — a footer that overlaps the tab
  // bar or a card clipped by the scroll container is invisible from the top.
  { name: 'home-bottom', query: 'screen=home', scroll: 'bottom' },
  { name: 'browse', query: 'screen=browse' },
  { name: 'notes', query: 'screen=notes' },
  { name: 'timer', query: 'screen=timer' },
  { name: 'askai', query: 'screen=askai' },
  { name: 'progress', query: 'screen=progress' },
  {
    name: 'questions',
    query: 'screen=browse&year=second-year&node=pathology&title=Pathology',
  },
  // Both themes get captured. A palette change that only ever gets eyeballed
  // in dark is a palette change that breaks light.
  { name: 'notes-bottom', query: 'screen=notes', scroll: 'bottom' },
  { name: 'progress-bottom', query: 'screen=progress', scroll: 'bottom' },
  { name: 'timer-bottom', query: 'screen=timer', scroll: 'bottom' },
  { name: 'home-light', query: 'screen=home&theme=light' },
  { name: 'progress-light', query: 'screen=progress&theme=light' },
];

const server = await createServer({
  configFile: path.join(here, 'vite.config.ts'),
  server: { port: 5199, strictPort: true },
  logLevel: 'error',
});
await server.listen();

await fs.mkdir(outDir, { recursive: true });

// The sandbox ships Chromium under a versioned directory; find it rather than
// hardcoding a build number that will rot.
const [chromeDir] = (await fs.readdir('/opt/pw-browsers'))
  .filter(entry => entry.startsWith('chromium-'))
  .sort()
  .reverse();

const browser = await chromium.launch({
  executablePath: `/opt/pw-browsers/${chromeDir}/chrome-linux/chrome`,
  args: ['--no-sandbox', '--font-render-hinting=none'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

const errors = [];
page.on('pageerror', error => errors.push(`${error.message}`));
page.on('console', message => {
  if (message.type() === 'error') {
    errors.push(message.text());
  }
});

for (const shot of SHOTS) {
  await page.goto(`http://localhost:5199/?${shot.query}`, { waitUntil: 'networkidle' });
  // Let springs settle and fonts swap in.
  await page.waitForTimeout(1200);
  if (shot.scroll === 'bottom') {
    // react-native-web renders ScrollView as an overflow container, so the
    // window does not scroll — find the scroller and drive it directly.
    await page.evaluate(() => {
      // Pick the *deepest, tallest* overflowing element. Taking the first
      // match walks into an ancestor that barely overflows and moves nothing.
      const candidates = [...document.querySelectorAll('div')]
        .filter(node => node.scrollHeight > node.clientHeight + 40)
        .sort(
          (a, b) =>
            b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
        );
      for (const node of candidates) {
        node.scrollTop = node.scrollHeight;
      }
    });
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(outDir, `${shot.name}.png`) });
  process.stdout.write(`captured ${shot.name}\n`);
}

await browser.close();
await server.close();

if (errors.length) {
  process.stdout.write(`\nRuntime errors seen while capturing:\n${errors.join('\n')}\n`);
  process.exitCode = 1;
}
