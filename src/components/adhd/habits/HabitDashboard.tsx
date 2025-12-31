"use client";

import * as React from "react";
import { LuPlus as Plus, LuTrendingUp as TrendingUp } from "react-icons/lu";
import { useHabitStore } from "@/store/adhd/habitStore";
import { HabitCard } from "./HabitCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface HabitDashboardProps {
  onCreateHabit?: () => void;
}

/**
 * HabitDashboard Component
 *
 * Main dashboard for displaying all user habits
 * Features:
 * - Grid layout of habit cards
 * - Loading states
 * - Empty state
 * - Create new habit button
 * - Auto-fetch on mount
 */
export function HabitDashboard({ onCreateHabit }: HabitDashboardProps) {
  const { habits, loading, error, fetchHabits } = useHabitStore();

  React.useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  if (loading && habits.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error al cargar hábitos</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => fetchHabits()} variant="outline">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (habits.length === 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>No tienes hábitos aún</CardTitle>
          <CardDescription>
            Crea tu primer hábito para empezar a construir rutinas positivas
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {onCreateHabit && (
            <Button onClick={onCreateHabit}>
              <Plus className="mr-2 h-4 w-4" />
              Crear mi primer hábito
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const completedToday = habits.filter((h) => h.completedToday).length;
  const totalHabits = habits.length;
  const completionRate = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mis Hábitos</h2>
          <p className="text-sm text-muted-foreground">
            {completedToday} de {totalHabits} completados hoy ({completionRate.toFixed(0)}%)
          </p>
        </div>
        {onCreateHabit && (
          <Button onClick={onCreateHabit}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Hábito
          </Button>
        )}
      </div>

      {/* Progress indicator */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
          style={{ width: `${completionRate}%` }}
        />
      </div>

      {/* Habits Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {habits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} />
        ))}
      </div>
    </div>
  );
}
