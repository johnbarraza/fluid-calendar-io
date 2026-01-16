"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useSettingsStore } from "@/store/settings";
import { ThemeMode } from "@/types/settings";
import {
  ThemeColor,
  ThemeStyle,
  colorPalettes,
  THEME_STORAGE_KEY,
} from "@/lib/themes";

type ThemeContextType = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  color: ThemeColor;
  setColor: (color: ThemeColor) => void;
  style: ThemeStyle;
  setStyle: (style: ThemeStyle) => void;
};

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: string;
  forcedTheme?: ThemeMode;
  enableSystem?: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Get stored color/style from localStorage
function getStoredPreferences(): { color: ThemeColor; style: ThemeStyle } {
  if (typeof window === "undefined") {
    return { color: "default", style: "modern" };
  }
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        color: parsed.color || "default",
        style: parsed.style || "modern",
      };
    }
  } catch {
    // Ignore
  }
  return { color: "default", style: "modern" };
}

export function ThemeProvider({
  children,
  attribute = "class",
  forcedTheme,
  enableSystem = true,
}: ThemeProviderProps) {
  const { user, updateUserSettings } = useSettingsStore();
  const [color, setColorState] = useState<ThemeColor>("default");
  const [style, setStyleState] = useState<ThemeStyle>("modern");
  const [mounted, setMounted] = useState(false);

  // Use forcedTheme if provided, otherwise use user theme
  const currentTheme = forcedTheme || user.theme;

  // Load stored preferences on mount
  useEffect(() => {
    const prefs = getStoredPreferences();
    setColorState(prefs.color);
    setStyleState(prefs.style);
    setMounted(true);
  }, []);

  // Apply color palette
  const applyColor = useCallback((themeColor: ThemeColor) => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    const palette = colorPalettes[themeColor];

    if (palette) {
      root.style.setProperty("--primary", palette.primary);
      root.style.setProperty("--primary-foreground", palette.primaryForeground);
      root.style.setProperty("--accent", palette.accent);
      root.style.setProperty("--accent-foreground", palette.primaryForeground);
    }
  }, []);

  // Apply visual style
  const applyStyle = useCallback((themeStyle: ThemeStyle) => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    root.classList.remove("style-modern", "style-pixel", "style-glass", "style-neumorphism");
    root.classList.add(`style-${themeStyle}`);
  }, []);

  // Function to apply theme to the DOM
  const applyTheme = useCallback(
    (theme: ThemeMode) => {
      const root = window.document.documentElement;

      root.classList.remove("light", "dark");

      if (attribute !== "class") {
        root.removeAttribute(attribute);
      }

      if (theme === "system" && enableSystem) {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";

        if (systemTheme === "dark") {
          root.classList.add("dark");
        }

        if (attribute !== "class") {
          root.setAttribute(attribute, systemTheme);
        }
      } else {
        if (theme === "dark") {
          root.classList.add("dark");
        }

        if (attribute !== "class") {
          root.setAttribute(attribute, theme);
        }
      }
    },
    [attribute, enableSystem]
  );

  // Apply theme when it changes
  useEffect(() => {
    if (forcedTheme) {
      applyTheme(forcedTheme);
    } else {
      applyTheme(user.theme);
    }
  }, [user.theme, forcedTheme, applyTheme]);

  // Apply color and style when they change
  useEffect(() => {
    if (!mounted) return;
    applyColor(color);
    applyStyle(style);

    // Store preferences
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ color, style }));
    } catch {
      // Ignore
    }
  }, [color, style, mounted, applyColor, applyStyle]);

  // Listen for system theme changes
  useEffect(() => {
    if (
      forcedTheme ||
      !enableSystem ||
      (forcedTheme ? forcedTheme : user.theme) !== "system"
    )
      return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [user.theme, forcedTheme, enableSystem, applyTheme]);

  const setTheme = (theme: ThemeMode) => {
    updateUserSettings({ theme });
    if (!forcedTheme) {
      applyTheme(theme);
    }
  };

  const setColor = (newColor: ThemeColor) => {
    setColorState(newColor);
  };

  const setStyle = (newStyle: ThemeStyle) => {
    setStyleState(newStyle);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        setTheme,
        color,
        setColor,
        style,
        setStyle
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

