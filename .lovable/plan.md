# Fixes: Presence Count + Custom Theme Icon

## 1. "Studying now" not updating across devices

The presence hook subscribes correctly, but the count stays at 1 on every device. Most likely cause: Supabase Realtime broadcasts presence diffs but our handler only listens for `sync` and recounts `presenceState()` — that part is fine. The real issue is that the channel topic `presence:studying` uses the reserved `presence:` prefix which Supabase treats specially and may silently drop cross-client sync without authentication context, so each tab only ever sees its own key.

### Fix in `src/hooks/use-online-presence.ts`
- Rename channel to a plain topic: `room:studying-lobby` (no reserved prefix).
- Also listen to `join` and `leave` events as a fallback (not only `sync`), and recompute on each.
- Add a heartbeat: re-track every 30s so stale presences (mobile background) get refreshed.
- Add a debug `console.log` (temporary) of `presenceState()` size on each sync so we can verify in the browser console while testing on two phones.

No backend/migration changes needed — Supabase Realtime presence works for anon clients out of the box, but the channel name must not collide with the reserved `presence:` namespace.

### Verification
Open the preview on two phones/browsers → both should show `2 studying now` within ~2s. Console will log `[presence] count: 2`.

## 2. Custom theme icon missing on the main themes button

In `src/components/theme/ThemeToggle.tsx`, the trigger button renders an icon only for `dark`, `light`, and `blackpink`. When `theme === "custom"`, no icon shows (button looks empty, as in the screenshot).

### Fix in `src/components/theme/ThemeToggle.tsx`
- Add a branch for `theme === "custom"` in the trigger button that renders the same colored swatch already shown in the dropdown item:
  ```tsx
  {theme === "custom" && (
    <span
      className="h-4 w-4 rounded-full border border-border"
      style={{ background: `linear-gradient(135deg, ${customColors.background}, ${customColors.primary})` }}
    />
  )}
  ```
- Add a `case "custom"` to `getButtonClass()` so the button container also adopts custom colors (use `customColors.card` background + `customColors.foreground` text via inline style, since custom colors are user-defined hex and can't be Tailwind classes).

### Out of scope
- No changes to CustomThemeDialog, ThemeProvider, or color tokens.
- No new themes added.