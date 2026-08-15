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
  { name: 'browse', query: 'screen=browse' },
  { name: 'notes', query: 'screen=notes' },
  { name: 'timer', query: 'screen=timer' },
  { name: 'askai', query: 'screen=askai' },
  { name: 'progress', query: 'screen=progress' },
  {
    name: 'questions',
    query: 'screen=browse&year=second-year&node=pathology&title=Pathology',
  },
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
  await page.screenshot({ path: path.join(outDir, `${shot.name}.png`) });
  process.stdout.write(`captured ${shot.name}\n`);
}

await browser.close();
await server.close();

if (errors.length) {
  process.stdout.write(`\nRuntime errors seen while capturing:\n${errors.join('\n')}\n`);
  process.exitCode = 1;
}
