"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Flame, Route, Footprints, Timer } from "lucide-react";

interface ActivityData {
    date: string;
    steps: number;
    distance: number;
    calories: number;
    activeMinutes: number;
    floors: number;
}

interface ActivityViewProps {
    data: ActivityData[];
    days: number;
}

export function ActivityView({ data, days }: ActivityViewProps) {
    // Sort data by date ascending for charts
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate max for scale
    const maxSteps = Math.max(...sortedData.map((d) => d.steps), 10000);

    // Calculate averages
    const avgSteps = data.length ? Math.round(data.reduce((sum, d) => sum + d.steps, 0) / data.length) : 0;
    const avgCalories = data.length ? Math.round(data.reduce((sum, d) => sum + d.calories, 0) / data.length) : 0;
    const avgActiveMin = data.length ? Math.round(data.reduce((sum, d) => sum + d.activeMinutes, 0) / data.length) : 0;
    const totalDistance = data.reduce((sum, d) => sum + d.distance, 0);

    if (data.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Sin datos de actividad</h3>
                    <p className="text-muted-foreground">
                        Sincroniza tu Fitbit para ver tu actividad
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats summary */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <Footprints className="h-4 w-4" />
                            <span className="text-xs font-medium">Promedio Pasos</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{avgSteps.toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                            <Flame className="h-4 w-4" />
                            <span className="text-xs font-medium">Promedio Calorías</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{avgCalories.toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <Timer className="h-4 w-4" />
                            <span className="text-xs font-medium">Promedio Activo</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{avgActiveMin} min</p>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <Route className="h-4 w-4" />
                            <span className="text-xs font-medium">Distancia Total</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{(totalDistance / 1000).toFixed(1)} km</p>
                    </CardContent>
                </Card>
            </div>

            {/* Steps chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Pasos Diarios</CardTitle>
                    <CardDescription>Últimos {days} días</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-end gap-1 sm:gap-2">
                        {sortedData.map((day, index) => {
                            const height = (day.steps / maxSteps) * 100;
                            const date = new Date(day.date);
                            const dayLabel = date.toLocaleDateString("es", { weekday: "short" }).slice(0, 2);
                            const isToday = day.date === new Date().toISOString().split("T")[0];

                            return (
                                <div
                                    key={`${day.date}-${index}`}
                                    className="flex-1 flex flex-col items-center gap-1"
                                    title={`${date.toLocaleDateString("es")}: ${day.steps.toLocaleString()} pasos`}
                                >
                                    <div className="relative w-full flex flex-col items-center">
                                        <span className="text-xs text-muted-foreground mb-1 hidden sm:block">
                                            {day.steps >= 1000 ? `${Math.round(day.steps / 1000)}k` : day.steps}
                                        </span>
                                        <div
                                            className={`w-full rounded-t transition-all hover:opacity-80 ${isToday
                                                ? "bg-blue-600 dark:bg-blue-500"
                                                : "bg-blue-400/70 dark:bg-blue-600/70"
                                                }`}
                                            style={{ height: `${Math.max(height, 4)}%`, minHeight: "4px" }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Goal line indicator */}
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                        <div className="w-8 h-0.5 bg-green-500/50" />
                        <span>Meta: 10,000 pasos</span>
                    </div>
                </CardContent>
            </Card>

            {/* Daily breakdown table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Historial Detallado</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-3 font-medium">Fecha</th>
                                    <th className="text-right py-2 px-3 font-medium">Pasos</th>
                                    <th className="text-right py-2 px-3 font-medium hidden sm:table-cell">Distancia</th>
                                    <th className="text-right py-2 px-3 font-medium">Calorías</th>
                                    <th className="text-right py-2 px-3 font-medium hidden md:table-cell">Activo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.slice(0, 10).map((day, index) => (
                                    <tr key={`${day.date}-${index}`} className="border-b border-muted/50 hover:bg-muted/30">
                                        <td className="py-2 px-3">
                                            {new Date(day.date).toLocaleDateString("es", {
                                                weekday: "short",
                                                month: "short",
                                                day: "numeric"
                                            })}
                                        </td>
                                        <td className="text-right py-2 px-3 font-medium">{day.steps.toLocaleString()}</td>
                                        <td className="text-right py-2 px-3 hidden sm:table-cell">{(day.distance / 1000).toFixed(1)} km</td>
                                        <td className="text-right py-2 px-3">{day.calories.toLocaleString()}</td>
                                        <td className="text-right py-2 px-3 hidden md:table-cell">{day.activeMinutes} min</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
