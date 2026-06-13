// Theme-aware gradient utility classes used across the Progress area
// so the active tab, XP bar, badges and accents all feel cohesive per theme.

export type ThemeKey = "dark" | "light" | "blackpink" | "custom" | "liquid-glass";

export interface ThemeGradient {
  // Tailwind class string for `bg-gradient-to-r ...`
  bg: string;
  // Tailwind class string for `bg-clip-text text-transparent` use
  text: string;
  // Solid ring/shadow hex (for box-shadow glows)
  glow: string;
}

const GRADIENTS: Record<ThemeKey, ThemeGradient> = {
  dark: {
    bg: "bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400",
    text: "bg-gradient-to-r from-fuchsia-400 via-pink-400 to-orange-300",
    glow: "236 72 153",
  },
  light: {
    bg: "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-400",
    text: "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500",
    glow: "168 85 247",
  },
  blackpink: {
    bg: "bg-gradient-to-r from-[#FF5C8D] via-pink-500 to-black",
    text: "bg-gradient-to-r from-[#FF5C8D] to-pink-400",
    glow: "255 92 141",
  },
  custom: {
    bg: "bg-gradient-to-r from-primary via-pink-500 to-orange-400",
    text: "bg-gradient-to-r from-primary to-orange-400",
    glow: "236 72 153",
  },
  "liquid-glass": {
    bg: "bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500",
    text: "bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400",
    glow: "56 189 248",
  },
};

export function getThemeGradient(theme: string | undefined): ThemeGradient {
  return GRADIENTS[(theme as ThemeKey) ?? "dark"] ?? GRADIENTS.dark;
}
