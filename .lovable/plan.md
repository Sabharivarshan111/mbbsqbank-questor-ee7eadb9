## Goal
Make the "Create Your Own Theme" dialog fit on a mobile screen so **Reset / Apply Theme** are visible without scrolling, and make the Apply button styling adapt per active theme (matching what the screenshots show — white pill in Dark, blue pill in Liquid Glass, etc.).

## Changes (single file: `src/components/theme/CustomThemeDialog.tsx`)

1. **Compact the layout so footer is above the fold on ~640px mobile:**
   - Reduce color-swatch tiles: shorter preview bar (`h-6` instead of `h-10`), tighter padding (`p-2`), remove the "hint" subtext (keep only the label). Keeps 2×2 grid but ~40% shorter.
   - Presets row: single line, smaller chips.
   - Live preview: shrink — remove "Sample Heading" + long paragraph, keep just a mini card row + Primary Button sample. Drop internal padding to `p-3`.
   - Tighten vertical rhythm: wrap sections in a `space-y-3` container instead of default gaps.
   - Make dialog `max-h-[90dvh]` and keep scroll as a fallback, but sticky the footer (`sticky bottom-0 bg-background pt-2`) so Reset/Apply are always visible even if content overflows on very small screens.

2. **Theme-aware Apply button** (matches screenshots):
   - Read `theme` from `useTheme()`.
   - Apply button uses the default shadcn `Button` (already themed via tokens) — but for **Liquid Glass** override to the vivid blue gradient shown in screenshot 2, and for **Dark / BlackPink** keep the white-on-dark pill shown in screenshot 1.
   - Reset button uses `variant="outline"` (already adapts).

3. No logic changes: `apply()`, `reset()`, `setCustomColors`, preset list, color pickers all unchanged.

## Out of scope
- No changes to `ThemeProvider`, `ThemeToggle`, or the preview/revert flow in the theme dropdown.
- No new presets or color logic.

## Verification
- Open dialog on 384×643 viewport (current user viewport) in each theme (Dark, Light, BlackPink, Liquid Glass, Custom) via Playwright, screenshot, confirm "Apply Theme" is visible without scrolling and its color matches the reference screenshots.
