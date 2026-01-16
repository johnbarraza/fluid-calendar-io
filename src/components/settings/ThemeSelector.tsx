"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { colorPalettes, styleDefinitions, ThemeColor, ThemeStyle } from "@/lib/themes";
import { ThemeMode } from "@/types/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Sparkles, Sun, Moon, Monitor } from "lucide-react";

export function ThemeSelector() {
    const { theme, setTheme, color, setColor, style, setStyle } = useTheme();

    const colors = Object.entries(colorPalettes) as [ThemeColor, typeof colorPalettes[ThemeColor]][];
    const styles = Object.entries(styleDefinitions) as [ThemeStyle, typeof styleDefinitions[ThemeStyle]][];

    const modes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
        { value: "light", label: "Claro", icon: <Sun className="h-4 w-4" /> },
        { value: "dark", label: "Oscuro", icon: <Moon className="h-4 w-4" /> },
        { value: "system", label: "Auto", icon: <Monitor className="h-4 w-4" /> },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Personalizar Tema
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Color Selection */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Color
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {colors.map(([key, palette]) => (
                            <Button
                                key={key}
                                variant={color === key ? "default" : "outline"}
                                size="sm"
                                className="flex flex-col h-auto py-2 gap-1"
                                onClick={() => setColor(key)}
                            >
                                <span className="text-lg">{palette.emoji}</span>
                                <span className="text-xs">{palette.name}</span>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Style Selection */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Estilo
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {styles.map(([key, styleInfo]) => (
                            <Button
                                key={key}
                                variant={style === key ? "default" : "outline"}
                                size="sm"
                                className="flex flex-col h-auto py-2 gap-1"
                                onClick={() => setStyle(key)}
                            >
                                <span className="text-lg">{styleInfo.emoji}</span>
                                <span className="text-xs">{styleInfo.name}</span>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Mode Selection */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium">Modo</h4>
                    <div className="flex gap-2">
                        {modes.map((mode) => (
                            <Button
                                key={mode.value}
                                variant={theme === mode.value ? "default" : "outline"}
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={() => setTheme(mode.value)}
                            >
                                {mode.icon}
                                {mode.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
