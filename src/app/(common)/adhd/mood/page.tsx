"use client";

import * as React from "react";
import { LuTrendingUp as TrendingUp, LuClock as Clock, LuSmile as Smile } from "react-icons/lu";
import { MoodLogger } from "@/components/adhd/mood";
import { useMoodStore } from "@/store/adhd/moodStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MoodPattern {
  averageMood: number;
  averageEnergy: number;
  moodTrend: "improving" | "declining" | "stable";
  energyTrend: "improving" | "declining" | "stable";
}

interface BestWorkTimes {
  morning: { score: number; recommended: boolean };
  afternoon: { score: number; recommended: boolean };
  evening: { score: number; recommended: boolean };
}

export default function MoodPage() {
  const { entries, fetchMoodEntries, fetchMoodPattern, fetchBestWorkTimes } =
    useMoodStore();

  const [pattern, setPattern] = React.useState<MoodPattern | null>(null);
  const [bestTimes, setBestTimes] = React.useState<BestWorkTimes | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);

  React.useEffect(() => {
    fetchMoodEntries(7);
  }, [fetchMoodEntries]);

  React.useEffect(() => {
    if (entries.length === 0) return;

    const loadAnalysis = async () => {
      setLoadingAnalysis(true);
      try {
        const [patternData, timesData] = await Promise.all([
          fetchMoodPattern(),
          fetchBestWorkTimes(),
        ]);
        setPattern(patternData);
        setBestTimes(timesData);
      } catch (error) {
        console.error("Failed to load analysis:", error);
      } finally {
        setLoadingAnalysis(false);
      }
    };

    loadAnalysis();
  }, [entries.length, fetchMoodPattern, fetchBestWorkTimes]);

  const getMoodEmoji = (mood: string | number) => {
    let moodValue: number;

    if (typeof mood === "string") {
      const moodMap: Record<string, number> = {
        very_positive: 5,
        positive: 4,
        neutral: 3,
        negative: 2,
        very_negative: 1,
      };
      moodValue = moodMap[mood] || 3;
    } else {
      moodValue = mood;
    }

    if (moodValue >= 4.5) return "😄";
    if (moodValue >= 3.5) return "🙂";
    if (moodValue >= 2.5) return "😐";
    if (moodValue >= 1.5) return "😟";
    return "😢";
  };

  const getEnergyBadge = (energy: string | number) => {
    let energyValue: number;

    if (typeof energy === "string") {
      const energyMap: Record<string, number> = {
        very_high: 5,
        high: 4,
        medium: 3,
        low: 2,
        very_low: 1,
      };
      energyValue = energyMap[energy] || 3;
    } else {
      energyValue = energy;
    }

    if (energyValue >= 4) return { label: "Alta", color: "bg-green-500/10 text-green-500" };
    if (energyValue >= 3) return { label: "Media", color: "bg-yellow-500/10 text-yellow-500" };
    return { label: "Baja", color: "bg-red-500/10 text-red-500" };
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estado de Ánimo</h1>
          <p className="text-sm text-muted-foreground">
            Registra cómo te sientes para identificar patrones y optimizar tu productividad
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Logger - Takes 1 column */}
          <div className="lg:col-span-1">
            <MoodLogger onSuccess={() => fetchMoodEntries(7)} />
          </div>

          {/* Analysis Cards - Takes 2 columns */}
          <div className="space-y-6 lg:col-span-2">
            {/* Pattern Analysis */}
            {loadingAnalysis ? (
              <Skeleton className="h-48" />
            ) : pattern ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle>Análisis de Patrones</CardTitle>
                  </div>
                  <CardDescription>Últimos 7 días</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Ánimo Promedio</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{getMoodEmoji(pattern.averageMood)}</span>
                      <span className="text-2xl font-bold">
                        {pattern.averageMood.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">/5</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Energía Promedio</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {pattern.averageEnergy.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">/5</span>
                      <Badge
                        variant="secondary"
                        className={getEnergyBadge(pattern.averageEnergy).color}
                      >
                        {getEnergyBadge(pattern.averageEnergy).label}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tendencia de Ánimo</p>
                    <Badge
                      variant="secondary"
                      className={
                        pattern.moodTrend === "improving"
                          ? "bg-green-500/10 text-green-500"
                          : pattern.moodTrend === "declining"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-gray-500/10 text-gray-500"
                      }
                    >
                      {pattern.moodTrend === "improving"
                        ? "↗ Mejorando"
                        : pattern.moodTrend === "declining"
                        ? "↘ Declinando"
                        : "→ Estable"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tendencia de Energía</p>
                    <Badge
                      variant="secondary"
                      className={
                        pattern.energyTrend === "improving"
                          ? "bg-green-500/10 text-green-500"
                          : pattern.energyTrend === "declining"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-gray-500/10 text-gray-500"
                      }
                    >
                      {pattern.energyTrend === "improving"
                        ? "↗ Mejorando"
                        : pattern.energyTrend === "declining"
                        ? "↘ Declinando"
                        : "→ Estable"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Best Work Times */}
            {bestTimes && bestTimes.morning && bestTimes.afternoon && bestTimes.evening && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle>Mejores Horarios de Trabajo</CardTitle>
                  </div>
                  <CardDescription>Basado en tu energía y estado de ánimo</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div
                    className={`rounded-lg border-2 p-4 ${
                      bestTimes.morning.recommended
                        ? "border-green-500 bg-green-500/5"
                        : "border-border"
                    }`}
                  >
                    <p className="mb-1 text-sm font-medium">Mañana</p>
                    <p className="text-2xl font-bold">{bestTimes.morning.score.toFixed(1)}</p>
                    {bestTimes.morning.recommended && (
                      <Badge variant="default" className="mt-2">
                        Recomendado
                      </Badge>
                    )}
                  </div>
                  <div
                    className={`rounded-lg border-2 p-4 ${
                      bestTimes.afternoon.recommended
                        ? "border-green-500 bg-green-500/5"
                        : "border-border"
                    }`}
                  >
                    <p className="mb-1 text-sm font-medium">Tarde</p>
                    <p className="text-2xl font-bold">{bestTimes.afternoon.score.toFixed(1)}</p>
                    {bestTimes.afternoon.recommended && (
                      <Badge variant="default" className="mt-2">
                        Recomendado
                      </Badge>
                    )}
                  </div>
                  <div
                    className={`rounded-lg border-2 p-4 ${
                      bestTimes.evening.recommended
                        ? "border-green-500 bg-green-500/5"
                        : "border-border"
                    }`}
                  >
                    <p className="mb-1 text-sm font-medium">Noche</p>
                    <p className="text-2xl font-bold">{bestTimes.evening.score.toFixed(1)}</p>
                    {bestTimes.evening.recommended && (
                      <Badge variant="default" className="mt-2">
                        Recomendado
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Entries */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smile className="h-5 w-5 text-primary" />
                  <CardTitle>Registros Recientes</CardTitle>
                </div>
                <CardDescription>Últimas 7 entradas</CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">
                    No hay registros aún. Empieza registrando tu estado de ánimo.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {entries.slice(0, 7).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(entry.timestamp), "PPp", { locale: es })}
                            </p>
                            {entry.note && (
                              <p className="text-xs text-muted-foreground">{entry.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={getEnergyBadge(entry.energyLevel).color}
                          >
                            Energía: {entry.energyLevel}/5
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
