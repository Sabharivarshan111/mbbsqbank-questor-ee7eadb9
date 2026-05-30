# Plan: Presence Count + AI Chat Fullscreen Mode

## 1. "Studying now" presence (verify + harden)

The `useOnlinePresence` hook is already wired into `PomodoroTimer.tsx` and shows `👥 N studying now` when `onlineCount > 0`. To make sure it always shows (even for the solo user, so they know the feature works):

- Change condition from `onlineCount > 0` to always render once `onlineCount >= 1` (the current user counts themselves once subscribed).
- Add a tiny fallback: if presence hasn't synced yet, show `👥 1 studying now` so it's never empty/confusing.
- No backend changes; Supabase Realtime presence channel `presence:studying` is anonymous and free.

## 2. AI Chat fullscreen expand button

Add a small **expand arrow icon** (like YouTube's fullscreen arrow in the reference image) in the top-right of the AI chat card header, next to the existing "Clear" button.

**File:** `src/components/AiChat.tsx`
- Add `Maximize2` icon from `lucide-react` (diagonal arrows, matches the reference).
- Add local state `isFullscreen` toggled by the button.
- When `isFullscreen` is true, render the chat `<Card>` inside a fixed-position overlay (`fixed inset-0 z-[60]`) that fills the viewport, with a `Minimize2` button to exit.
- When not fullscreen, render exactly as today (height `h-[390px]`).
- Use a portal-free approach: just conditionally swap the outer wrapper classes — keeps all existing chat state, messages, input, scroll behavior intact.
- Themed for `blackpink` / dark / light using existing `theme` variable.
- Tooltip on the button: "Open fullscreen" / "Exit fullscreen".
- Mobile-friendly: in fullscreen, header sticky, input pinned to bottom (safe-area aware via `pb-[env(safe-area-inset-bottom)]`).

## Out of scope
- A separate route/page for chat.
- Persisting fullscreen preference.
- Per-room presence or showing user identities.

## Files touched
- `src/components/AiChat.tsx` — add fullscreen toggle + button.
- `src/components/PomodoroTimer.tsx` — always render presence badge (small tweak).
