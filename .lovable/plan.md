# Fix 5 Layout & Walkthrough Issues

## 1. Empty space below footer in Liquid Glass theme
**File:** `src/pages/Index.tsx`
- Remove `min-h-screen` from the root wrapper so the page hugs its content instead of forcing the page to fill the viewport (which is what leaves the big pink/cream empty area in Liquid Glass).
- Keep `bg-background overflow-x-hidden relative` as-is.

## 2. "Create Your Own Theme" dialog clipped in Liquid Glass
**File:** `src/index.css`
- The universal `html.liquid-glass *` transition (line ~840) includes `transform` in its `transition-property`. This animates Radix Dialog's `translate(-50%, -50%)` centering and leaves the dialog stuck mid-slide so only the lower half is visible.
- Remove `transform` from that transition-property list (keep background-color, border-color, box-shadow, opacity, backdrop-filter, color). Hover lift on buttons already uses its own rule and still works because the property change is instantaneous.

**File:** `src/components/theme/CustomThemeDialog.tsx`
- Tighten dialog size for small screens: change `max-w-md max-h-[90vh] overflow-y-auto` to also include `w-[calc(100vw-2rem)] sm:w-full` so it never exceeds the viewport.

## 3. Pomodoro mini pill overlapping "Tap name to report any issues"
**File:** `src/pages/Index.tsx`
- Increase bottom clearance under the footer so the floating pill (which sits ~40 px from the bottom) never overlaps the "Tap name to report any issues" helper line.
- Change the footer wrapper from `mb-8` to `mb-8 pb-24` (adds ~96 px breathing room beneath the helper text — pill floats over the empty area instead of the text).

## 4. Walkthrough card hides "First Year" on the Question Bank step
**File:** `src/components/walkthrough/walkthroughSteps.ts`
- For the `qbank` step:
  - Change `targetSelector` from `'[data-tour="question-bank"]'` to `'[data-tour="question-bank"] [data-tour="qbank-header"]'` (a small target near the top of the section).
  - Add `placement: 'below'` so the tooltip sits beneath the highlighted header and the first-year accordion stays visible.

**File:** `src/components/QuestionBank.tsx` (small tweak)
- Add `data-tour="qbank-header"` to the existing header / search container near the top of the component so the new selector resolves. (If the component has no obvious header wrapper, wrap the title+search area in a `<div data-tour="qbank-header">`.)

## 5. Add a "Apply Theme" highlight step (like Pomodoro "Set this configuration")
**File:** `src/components/theme/CustomThemeDialog.tsx`
- Add `data-tour="custom-theme-apply"` to the `Apply Theme` `<Button>`.

**File:** `src/components/walkthrough/walkthroughSteps.ts`
- Insert a new step **immediately after** the existing `custom-theme` step:

```ts
{
  id: "custom-theme-apply",
  title: "Apply Your Theme ✅",
  description:
    "Once you've picked your colors, tap 'Apply Theme' to save and use your custom look across the whole app.",
  targetSelector: '[data-tour="custom-theme-apply"]',
  action: 'open-custom-theme',
  pomodoro: 'hide',
},
```

- `Walkthrough.tsx` already keeps the custom-theme dialog open whenever the active step's `action === 'open-custom-theme'`, so no changes there.

## Out of scope
- No timer engine, AI chat, theme tokens, or backend changes.
- Pomodoro pill visibility logic, theme menu controller, and existing walkthrough steps remain untouched apart from the two additions above.
- Total walkthrough step count goes from 15 → 16.
