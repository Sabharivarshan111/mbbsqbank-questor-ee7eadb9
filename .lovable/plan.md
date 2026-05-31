## Scope

Edit two files only. Pure UI/presentation. No logic changes. Applies to every theme (Dark / Light / BlackPink / Liquid Glass).

## 1. `src/pages/Index.tsx` — footer credit block

Current state in screenshot: "Created by [Sabharivarshan S] 👆 tap my name to report any issues!" wraps awkwardly into 2 lines, emoji looks unprofessional, and the name button has no obvious tap affordance against the surrounding text.

Redesign as a single, clean, vertically-stacked, centered block:

```text
            Created by
       ┌──────────────────┐
       │  Sabharivarshan S│   ← clearly-tappable pill button with subtle pulse
       └──────────────────┘
        ↑ Tap name to report any issues
```

Concrete changes:
- Wrap the credit block in a `flex flex-col items-center gap-2` container so "Created by", the name button, and the hint sit on three separate centered lines — never reflow into broken 2-line text.
- Keep the existing `<a>` to `sabharivarshanprofile.lovable.app` but restyle it as a proper pill button: `inline-flex items-center` , solid `border-primary/40`, `bg-primary/10`, `rounded-full`, `px-4 py-1.5`, `text-primary font-semibold`, `shadow-sm hover:bg-primary/20 hover:scale-[1.02] active:scale-95 transition-all`. Remove the always-on `animate-pulse` and the heavy `drop-shadow`; keep a soft `animate-pulse` only on a tiny dot indicator next to the name (optional) so it doesn't look like the whole label is flashing.
- Hint line below the button: replace `👆` emoji with a clean Lucide `ArrowUp` icon (`<ArrowUp className="h-3 w-3" />`) rendered inline before the text. Text: `Tap name to report any issues`. Single line, `text-xs text-muted-foreground`, centered. No emojis anywhere.
- All text uses semantic tokens (`text-muted-foreground`, `text-primary`) — works identically in Dark, Light, BlackPink, and Liquid Glass without per-theme branches.

## 2. Apply the same "whole-row tap highlight" treatment to footer links

The user notes that essay / short-note rows in QBank give clear feedback because the entire row darkens on tap, but footer links (Privacy Policy, Terms, About, Study Guides, FAQ) give no such feedback — user can't tell if a tap registered.

In `src/pages/Index.tsx` footer-links row:
- Change each `<Link>` from inline text to a block-ish tap target: `inline-flex items-center justify-center px-3 py-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent active:bg-accent/70 transition-colors`.
- Wrap them in `flex flex-wrap justify-center gap-1` so they remain centered and wrap cleanly on narrow viewports (the current layout wraps "Terms of Service" and "Study Guides" awkwardly into 2 lines per item — using a flex-wrap row of pill targets fixes both the tap-feedback and the wrap aesthetics in one move).
- Universal across themes — uses only `accent` / `muted-foreground` / `primary` tokens.

## 3. `src/components/theme/ThemeToggle.tsx` — remove "NEW" badge on Liquid Glass

Line 127 renders a `<span>NEW</span>` gradient badge next to the Liquid Glass theme option in the theme dropdown. Delete that span entirely. No other change to the dropdown.

## Out of scope

- Pomodoro pill / settings sheet — untouched.
- AiChat, QuestionBank, theme tokens, index.css — untouched.
- No business logic, no routing, no data changes.

## Verification

After build:
1. Footer renders as 3 centered stacked lines: "Created by" / pill-button name / "↑ Tap name to report any issues" — no broken 2-line wraps, no emoji.
2. Tapping the name pill visibly scales / brightens, then opens the external profile.
3. Tapping Privacy Policy / Terms / About / Study Guides / FAQ shows an `accent` background flash on press (matches QBank essay-row feedback).
4. Open the theme dropdown — Liquid Glass option no longer shows the "NEW" badge.
5. Switch through Dark, Light, BlackPink, Liquid Glass — footer looks identical in structure, only colors adapt via tokens.
