## Fix: walkthrough step 1 — can't type name / can't pick year

### Cause
The walkthrough overlay renders a full‑screen dim layer + card at `z-index ~2147483600`. The Radix `Select` dropdown opens in its own portal with the default `z-50`, so it appears **behind** the dim layer and feels unclickable. On touch devices, taps near the card edges can also fall onto the dim layer (which calls `next`/dismisses focus), making the name input feel unresponsive.

### Changes (single file)
`src/components/walkthrough/WalkthroughProfileSetup.tsx`
1. Lift the year dropdown above the overlay:
   - `<SelectContent className="z-[2147483700]">`
2. Stop taps from bleeding through to the dim layer by wrapping the form in a div with `onPointerDown`, `onTouchStart`, and `onClick` calling `e.stopPropagation()`.
3. Remove `autoFocus` from the name `<Input>` — on Android WebViews the early focus can swallow the first keystroke and confuse the IME. User taps to focus.

### Out of scope
- Walkthrough flow, step list, and the `Walkthrough.tsx` overlay logic stay unchanged.
- No DB / RLS / API changes.
