"use client";

import * as React from "react";
import {
  LuTrendingUp as TrendingUp,
  LuClock as Clock,
  LuTarget as Target,
  LuFlame as Flame,
} from "react-icons/lu";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RoutineStatsProps {
  routineId: string;
}

interface Stats {
  totalCompletions: number;
  averageDuration: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
}

export function RoutineStats({ routineId }: RoutineStatsProps) {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchStats = React.useCallback(async () => {
    try {
      const response = await fetch(
        `/api/adhd/routines/${routineId}/tracking?type=stats`
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch routine stats:", error);
    } finally {
      setLoading(false);
    }
  }, [routineId]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="h-20 animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No hay estadísticas disponibles
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Completions */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Completadas
            </p>
            <p className="mt-2 text-3xl font-bold">{stats.totalCompletions}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Veces completada en total
        </p>
      </Card>

      {/* Completion Rate */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Tasa de Éxito
            </p>
            <p className="mt-2 text-3xl font-bold">
              {stats.completionRate}%
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Sesiones completadas vs iniciadas
        </p>
      </Card>

      {/* Current Streak */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Racha Actual
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold">{stats.currentStreak}</p>
              <Badge variant={stats.currentStreak > 0 ? "default" : "secondary"}>
                {stats.currentStreak > 0 ? "🔥 Activa" : "Sin racha"}
              </Badge>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
            <Flame className="h-6 w-6 text-orange-500" />
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Días consecutivos completando
        </p>
      </Card>

      {/* Average Duration */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Tiempo Promedio
            </p>
            <p className="mt-2 text-3xl font-bold">
              {stats.averageDuration}m
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
            <Clock className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Duración real de completación
        </p>
      </Card>

      {/* Longest Streak */}
      {stats.longestStreak > 0 && (
        <Card className="p-6 sm:col-span-2 lg:col-span-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
              <Flame className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Mejor Racha
              </p>
              <p className="text-2xl font-bold">
                {stats.longestStreak} días consecutivos
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
