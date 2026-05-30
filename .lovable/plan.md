## Fix Liquid Glass theme: light background + readable tabs

The current Liquid Glass theme uses a deep dark navy background and dark glass tints, which is why everything reads as "blue" and the active tab pill (black on dark) is unreadable.

### Changes — all in `src/index.css`, scoped under `html.liquid-glass`

**1. Switch to light Apple-style palette**
- `--background: 0 0% 98%` (near-white)
- `--foreground: 220 15% 12%` (near-black text)
- `--card: 0 0% 100%`, `--popover: 0 0% 100%`
- `--primary: 211 100% 50%` (Apple blue, unchanged role)
- `--primary-foreground: 0 0% 100%`
- `--secondary` / `--muted`: very light gray `220 14% 96%` with dark foreground `220 15% 20%`
- `--border` / `--input`: `220 13% 88%` (soft gray, not pure white)
- `--muted-foreground: 220 10% 40%`

**2. Soften the drifting gradient background**
- Lower opacity of the radial gradients from ~0.30 to ~0.12 so the page reads as white with subtle color hints (like the attached screenshot's clean white sheet)
- Keep the same hues and `liquid-drift` animation

**3. Glass surface rules — light-mode tint**
- Cards/popovers/dialogs: `background-color: hsl(0 0% 100% / 0.65)`, border `hsl(220 13% 80% / 0.4)`, shadow softened (`0 8px 32px hsl(220 20% 40% / 0.12)`)
- Inputs: `hsl(0 0% 100% / 0.7)` with `hsl(220 13% 80% / 0.5)` border
- Scrollbar thumb: `hsl(220 10% 50% / 0.3)`

**4. Fix Essay/Short notes tab readability**
- Add a rule for active tab inside liquid-glass: ensure `[role="tab"][data-state="active"]` uses `background: hsl(0 0% 100% / 0.9)` and `color: hsl(var(--foreground))` (dark text on white pill) instead of inheriting a dark surface
- Inactive tab text: `color: hsl(var(--muted-foreground))`

**5. Keep**
- Font stack, transitions, hover lift, fade-in animation, radius — unchanged
- Other themes completely untouched (all rules remain under `html.liquid-glass`)

### Out of scope
- No changes to ThemeProvider, ThemeToggle, or any component file
- No new dependencies
