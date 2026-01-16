"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Heart, TrendingDown, TrendingUp, Activity } from "lucide-react";

interface HeartRateZone {
    name: string;
    min: number;
    max: number;
    minutes: number;
}

interface HeartRateData {
    date: string;
    restingHeartRate: number | null;
    heartRateZones: unknown;
}

interface HeartRateViewProps {
    data: HeartRateData[];
    days: number;
}

export function HeartRateView({ data, days }: HeartRateViewProps) {
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const dataWithHR = data.filter((d) => d.restingHeartRate !== null);

    // Calculate stats
    const avgHR = dataWithHR.length
        ? Math.round(dataWithHR.reduce((sum, d) => sum + (d.restingHeartRate ?? 0), 0) / dataWithHR.length)
        : null;

    const minHR = dataWithHR.length
        ? Math.min(...dataWithHR.map((d) => d.restingHeartRate ?? Infinity))
        : null;

    const maxHR = dataWithHR.length
        ? Math.max(...dataWithHR.map((d) => d.restingHeartRate ?? 0))
        : null;

    // Calculate max for chart scale
    const chartMax = maxHR ? maxHR + 10 : 80;
    const chartMin = minHR ? Math.max(minHR - 10, 30) : 50;

    // Aggregate heart rate zones
    const totalZones: Record<string, number> = {};
    data.forEach((d) => {
        const zones = d.heartRateZones as HeartRateZone[] | null;
        if (zones && Array.isArray(zones)) {
            zones.forEach((zone) => {
                totalZones[zone.name] = (totalZones[zone.name] ?? 0) + zone.minutes;
            });
        }
    });

    const zoneColors: Record<string, string> = {
        "Out of Range": "bg-gray-400",
        "Fat Burn": "bg-yellow-500",
        "Cardio": "bg-orange-500",
        "Peak": "bg-red-500",
    };

    const totalZoneMinutes = Object.values(totalZones).reduce((sum, v) => sum + v, 0);

    if (data.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Sin datos de frecuencia cardíaca</h3>
                    <p className="text-muted-foreground">
                        Sincroniza tu Fitbit para ver tu frecuencia cardíaca
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats summary */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <Heart className="h-4 w-4" />
                            <span className="text-xs font-medium">Promedio</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{avgHR ?? "—"} bpm</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <TrendingDown className="h-4 w-4" />
                            <span className="text-xs font-medium">Mínimo</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{minHR ?? "—"} bpm</p>
                    </CardContent>
                </Card>

                <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-medium">Máximo</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{maxHR ?? "—"} bpm</p>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <Activity className="h-4 w-4" />
                            <span className="text-xs font-medium">Días Registrados</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{dataWithHR.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Resting heart rate chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">FC en Reposo</CardTitle>
                    <CardDescription>Últimos {days} días</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-48 relative">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-muted-foreground">
                            <span>{chartMax}</span>
                            <span>{Math.round((chartMax + chartMin) / 2)}</span>
                            <span>{chartMin}</span>
                        </div>

                        {/* Chart area */}
                        <div className="ml-10 h-40 flex items-end gap-1 sm:gap-2">
                            {sortedData.map((day, index) => {
                                const hr = day.restingHeartRate;
                                const height = hr
                                    ? ((hr - chartMin) / (chartMax - chartMin)) * 100
                                    : 0;
                                const date = new Date(day.date);
                                const dayLabel = date.toLocaleDateString("es", { weekday: "short" }).slice(0, 2);
                                const isToday = day.date === new Date().toISOString().split("T")[0];

                                // Color based on HR level (lower is generally better for resting)
                                const bgColor = hr === null
                                    ? "bg-gray-200 dark:bg-gray-700"
                                    : hr <= 60
                                        ? "bg-green-500"
                                        : hr <= 70
                                            ? "bg-blue-500"
                                            : hr <= 80
                                                ? "bg-yellow-500"
                                                : "bg-red-500";

                                return (
                                    <div
                                        key={`${day.date}-${index}`}
                                        className="flex-1 flex flex-col items-center gap-1"
                                        title={`${date.toLocaleDateString("es")}: ${hr ?? "—"} bpm`}
                                    >
                                        <div className="relative w-full flex flex-col items-center h-32">
                                            {hr !== null && (
                                                <span className="text-xs text-muted-foreground mb-1 hidden sm:block">
                                                    {hr}
                                                </span>
                                            )}
                                            <div className="flex-1 w-full flex items-end">
                                                <div
                                                    className={`w-full rounded-t transition-all hover:opacity-80 ${isToday ? "ring-2 ring-white" : ""
                                                        } ${bgColor}`}
                                                    style={{
                                                        height: hr !== null ? `${Math.max(height, 4)}%` : "4px",
                                                        minHeight: "4px"
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Reference line */}
                        <div className="absolute right-0 ml-10 right-0" style={{ bottom: `${((60 - chartMin) / (chartMax - chartMin)) * 160 + 32}px` }}>
                            <div className="border-t border-dashed border-green-500/50 w-full" />
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-green-500" />
                            <span>Excelente (&lt;60)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-blue-500" />
                            <span>Bueno (60-70)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-yellow-500" />
                            <span>Normal (70-80)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-red-500" />
                            <span>Elevado (&gt;80)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Heart rate zones */}
            {totalZoneMinutes > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Zonas de FC</CardTitle>
                        <CardDescription>Tiempo en cada zona (acumulado)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(totalZones)
                                .sort((a, b) => {
                                    const order = ["Out of Range", "Fat Burn", "Cardio", "Peak"];
                                    return order.indexOf(a[0]) - order.indexOf(b[0]);
                                })
                                .map(([zoneName, minutes]) => {
                                    const percentage = (minutes / totalZoneMinutes) * 100;
                                    const hours = Math.floor(minutes / 60);
                                    const mins = Math.round(minutes % 60);

                                    const labels: Record<string, string> = {
                                        "Out of Range": "Fuera de Rango",
                                        "Fat Burn": "Quema de Grasa",
                                        "Cardio": "Cardio",
                                        "Peak": "Máximo",
                                    };

                                    return (
                                        <div key={zoneName} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">{labels[zoneName] ?? zoneName}</span>
                                                <span className="text-muted-foreground">
                                                    {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${zoneColors[zoneName] ?? "bg-gray-400"} rounded-full transition-all`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
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
                    <CardTitle className="text-lg">Historial FC en Reposo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-3 font-medium">Fecha</th>
                                    <th className="text-right py-2 px-3 font-medium">FC Reposo</th>
                                    <th className="text-right py-2 px-3 font-medium">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.slice(0, 10).map((day, index) => {
                                    const hr = day.restingHeartRate;
                                    const status = hr === null
                                        ? { label: "Sin datos", color: "text-gray-500" }
                                        : hr <= 60
                                            ? { label: "Excelente", color: "text-green-600" }
                                            : hr <= 70
                                                ? { label: "Bueno", color: "text-blue-600" }
                                                : hr <= 80
                                                    ? { label: "Normal", color: "text-yellow-600" }
                                                    : { label: "Elevado", color: "text-red-600" };

                                    return (
                                        <tr key={`${day.date}-${index}`} className="border-b border-muted/50 hover:bg-muted/30">
                                            <td className="py-2 px-3">
                                                {new Date(day.date).toLocaleDateString("es", {
                                                    weekday: "short",
                                                    month: "short",
                                                    day: "numeric"
                                                })}
                                            </td>
                                            <td className="text-right py-2 px-3 font-medium">
                                                {hr ?? "—"} bpm
                                            </td>
                                            <td className={`text-right py-2 px-3 ${status.color}`}>
                                                {status.label}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
