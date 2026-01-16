/**
 * Theme System - Color and Style Definitions
 */

export type ThemeColor = "default" | "ocean" | "forest" | "sunset" | "violet" | "mono";
export type ThemeStyle = "modern" | "pixel" | "glass" | "neumorphism";
export type ThemeMode = "light" | "dark" | "auto";

export interface ThemeConfig {
    color: ThemeColor;
    style: ThemeStyle;
    mode: ThemeMode;
}

export const DEFAULT_THEME: ThemeConfig = {
    color: "default",
    style: "modern",
    mode: "dark",
};

// Color palettes (HSL values for primary color)
export const colorPalettes: Record<ThemeColor, {
    name: string;
    primary: string;
    primaryForeground: string;
    accent: string;
    emoji: string;
}> = {
    default: {
        name: "Default",
        primary: "262.1 83.3% 57.8%",
        primaryForeground: "210 20% 98%",
        accent: "262.1 83.3% 57.8%",
        emoji: "🎨",
    },
    ocean: {
        name: "Ocean",
        primary: "199 89% 48%",
        primaryForeground: "210 20% 98%",
        accent: "187 92% 69%",
        emoji: "🌊",
    },
    forest: {
        name: "Forest",
        primary: "142 71% 45%",
        primaryForeground: "210 20% 98%",
        accent: "151 67% 65%",
        emoji: "🌲",
    },
    sunset: {
        name: "Sunset",
        primary: "25 95% 53%",
        primaryForeground: "210 20% 98%",
        accent: "43 96% 56%",
        emoji: "🌅",
    },
    violet: {
        name: "Violet",
        primary: "271 91% 65%",
        primaryForeground: "210 20% 98%",
        accent: "292 84% 61%",
        emoji: "💜",
    },
    mono: {
        name: "Mono",
        primary: "0 0% 45%",
        primaryForeground: "0 0% 98%",
        accent: "0 0% 60%",
        emoji: "⬜",
    },
};

// Style definitions
export const styleDefinitions: Record<ThemeStyle, {
    name: string;
    description: string;
    emoji: string;
}> = {
    modern: {
        name: "Moderno",
        description: "Esquinas redondeadas, sombras suaves",
        emoji: "✨",
    },
    pixel: {
        name: "Pixel",
        description: "Estilo retro 8-bit",
        emoji: "👾",
    },
    glass: {
        name: "Cristal",
        description: "Efecto glassmorphism",
        emoji: "💎",
    },
    neumorphism: {
        name: "Relieve",
        description: "Sombras suaves tipo 3D",
        emoji: "🔘",
    },
};

// localStorage key
export const THEME_STORAGE_KEY = "fluid-calendar-theme";

// Helper to get stored theme
export function getStoredTheme(): ThemeConfig {
    if (typeof window === "undefined") return DEFAULT_THEME;

    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored) as ThemeConfig;
        }
    } catch {
        // Ignore parsing errors
    }
    return DEFAULT_THEME;
}

// Helper to store theme
export function storeTheme(theme: ThemeConfig): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
}
