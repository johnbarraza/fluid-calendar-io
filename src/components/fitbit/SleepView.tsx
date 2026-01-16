"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Moon, Clock, Zap, BedDouble } from "lucide-react";

interface SleepStages {
    deep?: number;
    light?: number;
    rem?: number;
    wake?: number;
}

interface SleepData {
    date: string;
    duration: number;
    minutesAsleep: number;
    minutesAwake: number;
    efficiency: number | null;
    sleepStages: unknown;
    startTime: string;
    endTime: string;
}

interface SleepViewProps {
    data: SleepData[];
    days: number;
}

export function SleepView({ data, days }: SleepViewProps) {
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate averages
    const avgDuration = data.length ? Math.round(data.reduce((sum, d) => sum + d.duration, 0) / data.length) : 0;
    const avgEfficiency = data.length
        ? Math.round(data.filter(d => d.efficiency !== null).reduce((sum, d) => sum + (d.efficiency ?? 0), 0) / data.filter(d => d.efficiency !== null).length)
        : 0;

    // Calculate max duration for chart
    const maxDuration = Math.max(...sortedData.map((d) => d.duration), 480); // 8 hours minimum

    // Aggregate sleep stages
    const totalStages: SleepStages = { deep: 0, light: 0, rem: 0, wake: 0 };
    data.forEach((d) => {
        const stages = d.sleepStages as SleepStages | null;
        if (stages) {
            totalStages.deep = (totalStages.deep ?? 0) + (stages.deep ?? 0);
            totalStages.light = (totalStages.light ?? 0) + (stages.light ?? 0);
            totalStages.rem = (totalStages.rem ?? 0) + (stages.rem ?? 0);
            totalStages.wake = (totalStages.wake ?? 0) + (stages.wake ?? 0);
        }
    });

    const totalStageTime = (totalStages.deep ?? 0) + (totalStages.light ?? 0) + (totalStages.rem ?? 0) + (totalStages.wake ?? 0);

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    if (data.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Moon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Sin datos de sueño</h3>
                    <p className="text-muted-foreground">
                        Sincroniza tu Fitbit para ver tus patrones de sueño
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats summary */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <Moon className="h-4 w-4" />
                            <span className="text-xs font-medium">Promedio Duración</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{formatDuration(avgDuration)}</p>
                    </CardContent>
                </Card>

                <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <Zap className="h-4 w-4" />
                            <span className="text-xs font-medium">Eficiencia</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{avgEfficiency || "—"}%</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-medium">Prom. Dormirse</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">
                            {data.length > 0 ? formatTime(data[0].startTime) : "—"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <BedDouble className="h-4 w-4" />
                            <span className="text-xs font-medium">Prom. Despertar</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">
                            {data.length > 0 ? formatTime(data[0].endTime) : "—"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Sleep duration chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Duración de Sueño</CardTitle>
                    <CardDescription>Últimos {days} días</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-48 flex items-end gap-1 sm:gap-2">
                        {sortedData.map((day, index) => {
                            const height = (day.duration / maxDuration) * 100;
                            const date = new Date(day.date);
                            const dayLabel = date.toLocaleDateString("es", { weekday: "short" }).slice(0, 2);
                            const isToday = day.date === new Date().toISOString().split("T")[0];
                            const hours = day.duration / 60;

                            // Color based on sleep quality
                            const bgColor = hours >= 7
                                ? "bg-purple-500"
                                : hours >= 6
                                    ? "bg-purple-400"
                                    : "bg-purple-300";

                            return (
                                <div
                                    key={`${day.date}-${index}`}
                                    className="flex-1 flex flex-col items-center gap-1"
                                    title={`${date.toLocaleDateString("es")}: ${formatDuration(day.duration)}`}
                                >
                                    <div className="relative w-full flex flex-col items-center">
                                        <span className="text-xs text-muted-foreground mb-1 hidden sm:block">
                                            {hours.toFixed(1)}h
                                        </span>
                                        <div
                                            className={`w-full rounded-t transition-all hover:opacity-80 ${isToday ? "ring-2 ring-white" : ""
                                                } ${bgColor}`}
                                            style={{ height: `${Math.max(height, 4)}%`, minHeight: "4px" }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Goal line */}
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                        <div className="w-8 h-0.5 bg-green-500/50" />
                        <span>Meta: 7-9 horas</span>
                    </div>
                </CardContent>
            </Card>

            {/* Sleep stages breakdown */}
            {totalStageTime > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Etapas de Sueño</CardTitle>
                        <CardDescription>Distribución promedio</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[
                                { label: "Profundo", key: "deep", color: "bg-indigo-600", desc: "Recuperación física" },
                                { label: "Ligero", key: "light", color: "bg-blue-400", desc: "Mayor parte del sueño" },
                                { label: "REM", key: "rem", color: "bg-purple-500", desc: "Sueños y memoria" },
                                { label: "Despierto", key: "wake", color: "bg-gray-400", desc: "Interrupciones" },
                            ].map((stage) => {
                                const value = totalStages[stage.key as keyof SleepStages] ?? 0;
                                const percentage = totalStageTime > 0 ? (value / totalStageTime) * 100 : 0;

                                return (
                                    <div key={stage.key} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{stage.label}</span>
                                            <span className="text-muted-foreground">
                                                {Math.round(percentage)}% · {formatDuration(Math.round(value / data.length))}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${stage.color} rounded-full transition-all`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">{stage.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* History table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Historial de Sueño</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-3 font-medium">Fecha</th>
                                    <th className="text-right py-2 px-3 font-medium">Duración</th>
                                    <th className="text-right py-2 px-3 font-medium hidden sm:table-cell">Eficiencia</th>
                                    <th className="text-right py-2 px-3 font-medium">Horario</th>
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
                                        <td className="text-right py-2 px-3 font-medium">{formatDuration(day.duration)}</td>
                                        <td className="text-right py-2 px-3 hidden sm:table-cell">{day.efficiency ?? "—"}%</td>
                                        <td className="text-right py-2 px-3 text-muted-foreground">
                                            {formatTime(day.startTime)} - {formatTime(day.endTime)}
                                        </td>
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
