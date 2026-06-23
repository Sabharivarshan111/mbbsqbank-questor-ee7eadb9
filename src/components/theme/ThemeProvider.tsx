import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Theme = "dark" | "light" | "blackpink" | "custom" | "liquid-glass";

export type CustomColors = {
  background: string; // hex
  foreground: string;
  primary: string;
  card: string;
};

export type CustomSlot = 1 | 2;
export type CustomSlots = {
  slot1: CustomColors | null;
  slot2: CustomColors | null;
};

export const DEFAULT_CUSTOM_COLORS: CustomColors = {
  background: "#0f172a",
  foreground: "#f8fafc",
  primary: "#ec4899",
  card: "#1e293b",
};

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
  customSlots: CustomSlots;
  saveCustomSlot: (slot: CustomSlot, colors: CustomColors) => void;
  clearCustomSlot: (slot: CustomSlot) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const SLOTS_LS_KEY = "customThemeSlots";

function readLocalSlots(): CustomSlots {
  try {
    const raw = localStorage.getItem(SLOTS_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { slot1: parsed?.slot1 ?? null, slot2: parsed?.slot2 ?? null };
    }
  } catch {}
  return { slot1: null, slot2: null };
}

function isValidColors(v: any): v is CustomColors {
  return v && typeof v === "object"
    && typeof v.background === "string"
    && typeof v.foreground === "string"
    && typeof v.primary === "string"
    && typeof v.card === "string";
}

// ---------- color helpers ----------
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const toVar = (c: { h: number; s: number; l: number }) => `${c.h} ${c.s}% ${c.l}%`;
const adjust = (c: { h: number; s: number; l: number }, dl: number) =>
  ({ h: c.h, s: c.s, l: Math.max(0, Math.min(100, c.l + dl)) });

function applyCustomTheme(colors: CustomColors) {
  const bg = hexToHsl(colors.background);
  const fg = hexToHsl(colors.foreground);
  const primary = hexToHsl(colors.primary);
  const card = hexToHsl(colors.card);
  const isDark = bg.l < 50;
  const dir = isDark ? 1 : -1; // direction to derive contrast shades

  // Ensure card is always visibly distinct from background (min 6% lightness delta)
  const MIN_DELTA = 6;
  const cardDelta = (card.l - bg.l) * (isDark ? 1 : -1);
  const cardAdjusted = cardDelta < MIN_DELTA ? adjust(bg, dir * MIN_DELTA) : card;

  const muted = adjust(cardAdjusted, dir * 5);
  const border = adjust(cardAdjusted, dir * 14);
  const mutedFg = adjust(fg, -dir * 30);
  const primaryFg = primary.l > 55 ? { h: 0, s: 0, l: 5 } : { h: 0, s: 0, l: 98 };

  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set("--background", toVar(bg));
  set("--foreground", toVar(fg));
  set("--card", toVar(cardAdjusted));
  set("--card-foreground", toVar(fg));
  set("--popover", toVar(cardAdjusted));
  set("--popover-foreground", toVar(fg));
  set("--primary", toVar(primary));
  set("--primary-foreground", toVar(primaryFg));
  set("--secondary", toVar(muted));
  set("--secondary-foreground", toVar(fg));
  set("--muted", toVar(muted));
  set("--muted-foreground", toVar(mutedFg));
  set("--accent", toVar(muted));
  set("--accent-foreground", toVar(fg));
  set("--border", toVar(border));
  set("--input", toVar(border));
  set("--ring", toVar(primary));
}

function clearCustomTheme() {
  const root = document.documentElement;
  const keys = [
    "--background", "--foreground", "--card", "--card-foreground",
    "--popover", "--popover-foreground", "--primary", "--primary-foreground",
    "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
    "--accent", "--accent-foreground", "--border", "--input", "--ring",
  ];
  keys.forEach((k) => root.style.removeProperty(k));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved && ["dark", "light", "blackpink", "custom", "liquid-glass"].includes(saved)) return saved;
    return "dark";
  });

  const [customColors, setCustomColorsState] = useState<CustomColors>(() => {
    try {
      const saved = localStorage.getItem("customTheme");
      if (saved) return { ...DEFAULT_CUSTOM_COLORS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_CUSTOM_COLORS;
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "blackpink", "custom", "liquid-glass");
    root.classList.add(theme);

    if (theme === "custom") {
      applyCustomTheme(customColors);
    } else {
      clearCustomTheme();
    }
  }, [theme, customColors]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const setCustomColors = useCallback((c: CustomColors) => {
    setCustomColorsState(c);
    localStorage.setItem("customTheme", JSON.stringify(c));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
