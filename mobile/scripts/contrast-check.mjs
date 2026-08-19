// Every theme the app ships has to be readable.
//
// Custom themes are the user's business — four free colours can produce
// unreadable text, and the editor says so in the preview rather than refusing
// the choice. What ships, though, is ours: the named presets and the quick
// presets are starting points people will sit on for months, and one of those
// being hard to read is a bug we shipped, not a choice they made.
//
// It also checks what the *derivation* produces, not just the four picked
// colours: textMuted, border and cardElevated are computed, so a bad ratio
// there is a bug in paletteFrom that no amount of choosing well would fix.
//
//   node scripts/contrast-check.mjs
import { build } from 'esbuild';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(here, '..');
const bundled = await build({
  entryPoints: [path.join(root, 'src', 'theme', 'presets.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
  absWorkingDir: root,
  alias: { '@': path.join(root, 'src') },
});
const { PRESETS, QUICK_PRESETS, paletteFrom } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);
const colorBundle = await build({
  entryPoints: [path.join(root, 'src', 'theme', 'color.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
});
const { contrast, lit } = await import(
  `data:text/javascript;base64,${Buffer.from(colorBundle.outputFiles[0].text).toString('base64')}`
);

// WCAG AA: 4.5:1 for body text, 3:1 for large text and UI components.
const RULES = [
  { name: 'text on background', a: 'text', b: 'background', min: 4.5 },
  { name: 'text on card', a: 'text', b: 'card', min: 4.5 },
  // Derived. A muted colour that fails here is a bug in paletteFrom.
  { name: 'muted on background', a: 'textMuted', b: 'background', min: 3 },
  { name: 'accent on background', a: 'accent', b: 'background', min: 3 },
  { name: 'label on accent', a: 'onAccent', b: 'accent', min: 4.5 },
  // The bottom nav's blob is a gradient, so the icon on it has to survive the
  // far stop as well as the accent itself. `lit` moves away from the label
  // colour precisely so this can never be the failing end — this is the proof,
  // not the argument.
  { name: 'icon on lit blob', a: 'onAccent', b: 'blobLit', min: 4.5 },
  // A card you cannot see is the flat-wall-of-borders problem.
  { name: 'card vs background', a: 'card', b: 'background', min: 1.05 },
];

let failures = 0;
const themes = [
  ...PRESETS.map(p => ({ name: p.name, palette: p.palette })),
  ...QUICK_PRESETS.map(p => ({ name: `${p.name} (quick)`, palette: p.palette })),
];

for (const theme of themes) {
  const colors = paletteFrom(theme.palette);
  colors.blobLit = lit(colors.accent, colors.onAccent);
  const bad = [];
  for (const rule of RULES) {
    const ratio = contrast(colors[rule.a], colors[rule.b]);
    if (ratio < rule.min) {
      bad.push(`${rule.name} ${ratio.toFixed(2)}:1 < ${rule.min}`);
    }
  }
  if (bad.length) {
    failures += bad.length;
  }
  process.stdout.write(
    `${bad.length ? 'FAIL ' : 'ok   '} ${theme.name.padEnd(18)} ` +
      (bad.length
        ? bad.join('; ')
        : `text ${contrast(colors.text, colors.background).toFixed(1)}:1, ` +
          `accent ${contrast(colors.accent, colors.background).toFixed(1)}:1, ` +
          `label ${contrast(colors.onAccent, colors.accent).toFixed(1)}:1`) +
      '\n',
  );
}

process.stdout.write(failures ? `\n${failures} FAILED\n` : '\nOK\n');
process.exitCode = failures ? 1 : 0;
