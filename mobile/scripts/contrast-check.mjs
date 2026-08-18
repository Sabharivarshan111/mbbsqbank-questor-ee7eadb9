// Every accent, on both bases, has to stay readable.
//
// This is the guarantee that replaces the reference design's four free colour
// pickers with a live preview. A preview makes legibility the user's problem
// and can only show them one screen; this proves the property for every
// combination the app can be in, before it ships.
//
//   node scripts/contrast-check.mjs
import { build } from 'esbuild';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const bundled = await build({
  entryPoints: [path.join(here, '..', 'src', 'theme', 'accents.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
});
const { ACCENTS, accentColor, contrast, onColor } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);

// The two bases, as theme/index.tsx defines them.
const BASE = { dark: '#000000', light: '#FFFFFF' };
// WCAG AA for large text and UI components. Accents are used for headings,
// icons and filled buttons, not body copy, so 3:1 is the right bar —
// demanding 4.5:1 would rule out every usable accent on black.
const MIN_ON_BASE = 3;
// Text sitting ON a filled accent is small and must clear the full AA bar.
const MIN_ON_ACCENT = 4.5;

let failures = 0;
for (const accent of ACCENTS) {
  for (const base of ['dark', 'light']) {
    const hue = accentColor(accent.key, base);
    const onBase = contrast(hue, BASE[base]);
    const label = onColor(hue);
    const onAccent = contrast(hue, label);

    const okBase = onBase >= MIN_ON_BASE;
    const okText = onAccent >= MIN_ON_ACCENT;
    if (!okBase || !okText) failures++;

    process.stdout.write(
      `${okBase && okText ? 'ok   ' : 'FAIL '} ${accent.name.padEnd(8)} ${base.padEnd(5)} ${hue}  ` +
        `on ${base}: ${onBase.toFixed(1)}:1  ` +
        `${label === '#FFFFFF' ? 'white' : 'black'} on it: ${onAccent.toFixed(1)}:1\n`,
    );
  }
}

process.stdout.write(failures ? `\n${failures} FAILED\n` : '\nOK\n');
process.exitCode = failures ? 1 : 0;
