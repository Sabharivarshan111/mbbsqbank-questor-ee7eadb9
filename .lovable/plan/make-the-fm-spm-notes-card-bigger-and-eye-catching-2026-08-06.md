# Make the FM + SPM notes card bigger and eye-catching

The FM + SPM ₹50 pill on Home is currently smaller than the WhatsApp row below it. It becomes a same-size (or slightly larger) glowing card that clearly sells the notes.

## What changes

Only the Home-screen trigger button of the premium notes card. Position stays the same (above the WhatsApp row). Checkout dialog, payment flow, sign-in gate, and unlocked "Open Drive" state all stay as they are.

New look, matched to the WhatsApp row shape (rounded-2xl, icon circle, two text lines, action label on the right) but slightly taller and glowing:

- Amber/gold gradient tint with a soft coloured glow ring (animated pulse-glow), so it stands out against the green WhatsApp row.
- Book icon in a glowing circle badge.
- Headline: **Get your FM & SPM notes for ₹50 only**
- Sub-line (small, 2 lines): FM 160 pages · SPM 130 pages — revise in one night. All important questions with answers, mnemonics & easy flowcharts.
- Right side: a "₹50 · Buy" chip that reads as a button.
- Small "One-night revision" style tag to add urgency.

The unlocked state keeps the same larger card shape, in emerald, saying the notes are unlocked with an "Open Drive" action.

## Technical notes

- Edit `src/components/PremiumNotesCard.tsx` — replace the trigger `<button>` markup (and the `owned` anchor) with the larger card layout; no logic changes.
- Glow via a design-token-based ring/shadow plus a subtle `animate-pulse`-style glow; colours through existing semantic/amber utilities used elsewhere in the file, no new hardcoded hex.
- No changes to ads, Razorpay, edge functions, or `HomeTab.tsx` ordering.
