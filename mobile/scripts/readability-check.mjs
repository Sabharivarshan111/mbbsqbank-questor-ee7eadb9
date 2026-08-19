// Proves the wallpaper readability solver on real colours.
//
// The claim it has to earn: for any media colour, any theme, the scrim it
// returns makes the text it returns clear WCAG AA — and it does so with the
// lightest scrim that works, so the photograph survives.
//
//   node scripts/readability-check.mjs
import { build } from 'esbuild';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(here, '..');
const bundle = async entry => {
  const out = await build({
    entryPoints: [path.join(root, entry)],
    bundle: true, format: 'esm', write: false, platform: 'neutral',
    absWorkingDir: root, alias: { '@': path.join(root, 'src') },
  });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
};
const { readabilityFor, effectiveBackground, minimumDim, TARGET_CONTRAST } =
  await bundle('src/lib/wallpaperReadability.ts');
const { contrast } = await bundle('src/theme/color.ts');

// Media colours spanning the range a real photo library produces.
const MEDIA = [
  ['midnight sky', '#0A1020'], ['dark forest', '#16301F'], ['charcoal', '#2B2B2B'],
  ['mid grey', '#808080'], ['sunset orange', '#FF9A3C'], ['sky blue', '#7EC8F5'],
  ['beach sand', '#EFE0C0'], ['snow', '#FAFAFA'], ['neon magenta', '#FF00AA'],
  ['deep red', '#7A0B0B'], ['lime', '#B6FF3C'], ['pure white', '#FFFFFF'],
  ['pure black', '#000000'],
];
const THEMES = [
  ['Dark', '#000000', '#FFFFFF'],
  ['Light', '#FFFFFF', '#0A0A0B'],
  ['Liquid Glass', '#EAEFF6', '#0F1419'],
];

let failures = 0;
let heavy = 0;
for (const [themeName, bg, text] of THEMES) {
  process.stdout.write(`\n${themeName} (bg ${bg}, text ${text})\n`);
  for (const [name, media] of MEDIA) {
    const r = readabilityFor(media, bg, text);
    const actual = contrast(r.text, effectiveBackground(media, bg, r.dim));

    // 1. It must actually reach AA.
    const ok = actual >= TARGET_CONTRAST - 0.01;
    // 2. It must not overshoot: a scrim 0.05 lighter should fail, or it is
    //    darkening the photo more than the guarantee required.
    const lighter = r.dim > 0.02
      ? contrast(r.text, effectiveBackground(media, bg, Math.max(0, r.dim - 0.05)))
      : 0;
    const minimal = r.dim === 0 || lighter < TARGET_CONTRAST;

    if (!ok || !minimal) failures += 1;
    if (r.dim > 0.75) heavy += 1;

    process.stdout.write(
      `  ${ok && minimal ? 'ok  ' : 'FAIL'} ${name.padEnd(14)} ${media}  ` +
      `dim ${String(Math.round(r.dim * 100)).padStart(3)}%  ` +
      `text ${r.text}  ${actual.toFixed(1)}:1  ` +
      `${r.keptThemeText ? 'kept theme text' : 'flipped'}` +
      `${ok ? '' : '  ← below AA'}${minimal ? '' : '  ← scrim heavier than needed'}\n`,
    );
  }
}

/**
 * Boundary cases: text the same colour as the media.
 *
 * The first version of this asserted the returned dim was "over 0.6", a number
 * picked out of the air — and both cases failed at 0.54 and 0.46, which are
 * correct answers. Blending white media 54% toward a black theme is genuinely
 * dark enough for white text. The invariant worth asserting is the one the
 * solver actually promises: whatever dim comes back reaches AA.
 */
const edge = [
  ['white text, white media, dark theme', '#FFFFFF', '#000000', '#FFFFFF'],
  ['black text, black media, light theme', '#000000', '#FFFFFF', '#000000'],
  ['white text, black media, dark theme', '#000000', '#000000', '#FFFFFF'],
];
process.stdout.write('\nedge cases — text the same colour as the media\n');
for (const [name, media, bg, text] of edge) {
  const dim = minimumDim(media, bg, text);
  const reached = dim === null ? 0 : contrast(text, effectiveBackground(media, bg, dim));
  const pass = dim !== null && reached >= TARGET_CONTRAST - 0.01;
  if (!pass) failures += 1;
  process.stdout.write(
    `  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(38)} dim ${String(Math.round((dim ?? 1) * 100)).padStart(3)}%  ${reached.toFixed(1)}:1\n`,
  );
}

process.stdout.write(
  `\n${failures === 0 ? 'OK' : `${failures} FAILED`}` +
  `${heavy ? ` (${heavy} combinations need a scrim over 75%)` : ''}\n`,
);
process.exitCode = failures ? 1 : 0;
