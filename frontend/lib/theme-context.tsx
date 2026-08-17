"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES, type ThemeId } from "@/lib/constants";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const fig = typeof window !== "undefined" ? window.fig : undefined;
    if (fig?.theme) {
      fig.theme
        .get()
        .then((t) => {
          if (THEMES.some((x) => x.id === t)) setThemeState(t as ThemeId);
        })
        .catch(() => {});
    } else {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      if (stored && THEMES.some((t) => t.id === stored)) {
        setThemeState(stored);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    const fig = typeof window !== "undefined" ? window.fig : undefined;
    if (fig?.theme) void fig.theme.set(next);
    setThemeState(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}