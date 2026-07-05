## Theme Picker — Apply / Revert Flow

### Problem
Right now clicking any theme in the dropdown immediately applies it permanently. Users want to preview first, then decide.

### Solution
Turn the theme dropdown into a preview-then-confirm flow.

### Changes

**1. `src/components/theme/ThemeToggle.tsx`**
- Add local state: `previewTheme: Theme | null` and `appliedTheme: Theme` ( mirrors the current saved theme).
- When a user clicks a theme item (Dark, Light, Black Pink, Liquid Glass, My Theme):
  - Set `previewTheme` to that value.
  - Call `setTheme(previewTheme)` so the app previews it live.
  - Do NOT change `appliedTheme` yet.
- When user clicks **"Create Your Own…"**, keep existing behavior: open `CustomThemeDialog`, no preview state change.
- Render a confirmation bar **below the theme list** inside the dropdown, visible only when `previewTheme !== null && previewTheme !== appliedTheme`:
  - **Left button:** "Revert" — calls `setTheme(appliedTheme)` and clears `previewTheme`.
  - **Right button:** "Apply" — calls `setTheme(previewTheme)`, updates `appliedTheme` to `previewTheme`, and clears `previewTheme`.
- The active indicator ("Default", "Active") stays on `appliedTheme` until Apply is pressed, or moves to `previewTheme` if we prefer. We'll keep it on `appliedTheme` to avoid confusion.
- Close the dropdown automatically after Apply or Revert.

**2. `src/components/theme/ThemeProvider.tsx`** (no changes needed)
- `setTheme` already handles live switching and localStorage. We'll just call it for preview and apply.

**3. Edge cases**
- If user closes the dropdown without clicking Apply or Revert, the previewed theme remains active. We can either auto-revert on dropdown close, or leave it. Safer behavior: on `onOpenChange` → false, if `previewTheme` is set and not applied, revert to `appliedTheme` automatically so the user doesn't get stuck with an accidental preview.

### Acceptance criteria
- Clicking a theme previews it instantly across the app.
- "Apply" and "Revert" buttons appear below the theme list during preview.
- Apply saves the theme and closes the dropdown.
- Revert restores the previous theme and closes the dropdown.
- Closing the dropdown without pressing either auto-reverts to the last saved theme.
- "Create Your Own…" still opens the custom dialog without triggering the preview bar.
