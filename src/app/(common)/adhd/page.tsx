"use client";

import * as React from "react";
import Link from "next/link";
import {
  LuTarget as Target,
  LuSmile as Smile,
  LuClock as Clock,
  LuSparkles as Sparkles,
  LuTrendingUp as TrendingUp,
  LuCalendar as Calendar,
  LuChevronRight as ChevronRight,
} from "react-icons/lu";
import { useHabitStore } from "@/store/adhd/habitStore";
import { useMoodStore } from "@/store/adhd/moodStore";
import { usePomodoroStore } from "@/store/adhd/pomodoroStore";
import { useSuggestionStore } from "@/store/adhd/suggestionStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function ADHDDashboardPage() {
  const { habits, fetchHabits, loading: habitsLoading } = useHabitStore();
  const { entries: moodEntries, fetchMoodEntries, loading: moodLoading } = useMoodStore();
  const { recentSessions, fetchRecentSessions, loading: pomodoroLoading } = usePomodoroStore();
  const {
    suggestions,
    fetchSuggestions,
    loading: suggestionsLoading,
  } = useSuggestionStore();

  const [habitStats, setHabitStats] = React.useState({
    total: 0,
    completedToday: 0,
    currentStreak: 0,
  });

  const [moodStats, setMoodStats] = React.useState({
    averageMood: 0,
    averageEnergy: 0,
    entriesThisWeek: 0,
  });

  const [pomodoroStats, setPomodoroStats] = React.useState({
    todaySessions: 0,
    focusTime: 0,
    completionRate: 0,
  });

  const [suggestionStats, setSuggestionStats] = React.useState({
    pending: 0,
    highConfidence: 0,
  });

  React.useEffect(() => {
    fetchHabits();
    fetchMoodEntries(7);
    fetchRecentSessions(7);
    fetchSuggestions();
  }, [fetchHabits, fetchMoodEntries, fetchRecentSessions, fetchSuggestions]);

  // Calculate habit stats
  React.useEffect(() => {
    if (habits.length > 0) {
      const completedToday = habits.filter((h) => h.completedToday).length;
      const maxStreak = Math.max(...habits.map((h) => h.currentStreak), 0);

      setHabitStats({
        total: habits.length,
        completedToday,
        currentStreak: maxStreak,
      });
    }
  }, [habits]);

  // Calculate mood stats
  React.useEffect(() => {
    if (moodEntries.length > 0) {
      const avgMood =
        moodEntries.reduce((sum, entry) => sum + entry.mood, 0) / moodEntries.length;
      const avgEnergy =
        moodEntries.reduce((sum, entry) => sum + entry.energy, 0) / moodEntries.length;

      setMoodStats({
        averageMood: avgMood,
        averageEnergy: avgEnergy,
        entriesThisWeek: moodEntries.length,
      });
    }
  }, [moodEntries]);

  // Calculate pomodoro stats
  React.useEffect(() => {
    if (recentSessions && recentSessions.length > 0) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const todaySessions = recentSessions.filter(
        (s) => new Date(s.startTime) >= today && s.completed
      );

      const focusTime = recentSessions
        .filter((s) => s.type === "work" && s.completed)
        .reduce((acc, s) => {
          const start = new Date(s.startTime);
          const end = s.endTime ? new Date(s.endTime) : new Date();
          return acc + (end.getTime() - start.getTime()) / 1000 / 60;
        }, 0);

      const completed = recentSessions.filter((s) => s.completed).length;
      const total = recentSessions.length;

      setPomodoroStats({
        todaySessions: todaySessions.length,
        focusTime: Math.round(focusTime),
        completionRate: total > 0 ? (completed / total) * 100 : 0,
      });
    }
  }, [recentSessions]);

  // Calculate suggestion stats
  React.useEffect(() => {
    if (suggestions.length > 0) {
      const pending = suggestions.filter((s) => s.status === "pending").length;
      const highConfidence = suggestions.filter((s) => s.confidence >= 0.8).length;

      setSuggestionStats({
        pending,
        highConfidence,
      });
    }
  }, [suggestions]);

  const getMoodEmoji = (mood: number) => {
    if (mood >= 4.5) return "😄";
    if (mood >= 3.5) return "🙂";
    if (mood >= 2.5) return "😐";
    if (mood >= 1.5) return "😟";
    return "😢";
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isLoading = habitsLoading || moodLoading || pomodoroLoading || suggestionsLoading;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel ADHD</h1>
          <p className="text-sm text-muted-foreground">
            Tu centro de control para productividad y bienestar
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Bienvenido a tus herramientas ADHD
              </CardTitle>
              <CardDescription>
                Herramientas diseñadas específicamente para personas con ADHD
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Este panel integra técnicas probadas como el método Pomodoro, seguimiento de
                hábitos, registro de estado de ánimo y sugerencias inteligentes basadas en IA para
                ayudarte a mantener el enfoque y la productividad.
              </p>
            </CardContent>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Habits Card */}
            <Link href="/adhd/habits" className="block">
              <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Target className="h-5 w-5 text-primary" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Hábitos</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-16" />
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{habitStats.completedToday}</span>
                          <span className="text-sm text-muted-foreground">
                            / {habitStats.total} hoy
                          </span>
                        </div>
                        <Progress
                          value={
                            habitStats.total > 0
                              ? (habitStats.completedToday / habitStats.total) * 100
                              : 0
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          🔥 Racha máxima: {habitStats.currentStreak}{" "}
                          {habitStats.currentStreak === 1 ? "día" : "días"}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* Mood Card */}
            <Link href="/adhd/mood" className="block">
              <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Smile className="h-5 w-5 text-primary" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Estado de Ánimo</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-16" />
                  ) : moodEntries.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">
                          {getMoodEmoji(moodStats.averageMood)}
                        </span>
                        <div>
                          <p className="text-2xl font-bold">
                            {moodStats.averageMood.toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">promedio esta semana</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        ⚡ Energía: {moodStats.averageEnergy.toFixed(1)}/5
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Empieza a registrar tu estado de ánimo
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* Pomodoro Card */}
            <Link href="/adhd/pomodoro" className="block">
              <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Clock className="h-5 w-5 text-primary" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Pomodoro</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-16" />
                  ) : recentSessions.length > 0 ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            {pomodoroStats.todaySessions}
                          </span>
                          <span className="text-sm text-muted-foreground">sesiones hoy</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ⏱️ {formatDuration(pomodoroStats.focusTime)} de enfoque esta semana
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ✓ {Math.round(pomodoroStats.completionRate)}% completadas
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Empieza tu primera sesión Pomodoro
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* Suggestions Card */}
            <Link href="/adhd/suggestions" className="block">
              <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Sugerencias IA</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-16" />
                  ) : suggestions.length > 0 ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{suggestionStats.pending}</span>
                          <span className="text-sm text-muted-foreground">pendientes</span>
                        </div>
                        {suggestionStats.highConfidence > 0 && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                            {suggestionStats.highConfidence} alta confianza
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Revisa las sugerencias optimizadas para ti
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Genera sugerencias inteligentes
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Getting Started */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle>Primeros Pasos</CardTitle>
                </div>
                <CardDescription>Maximiza tu productividad con estas acciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium">Crea tus primeros hábitos</p>
                    <p className="text-xs text-muted-foreground">
                      Define rutinas diarias para construir consistencia
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium">Registra tu estado de ánimo</p>
                    <p className="text-xs text-muted-foreground">
                      Identifica patrones y optimiza tus horarios de trabajo
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium">Usa el temporizador Pomodoro</p>
                    <p className="text-xs text-muted-foreground">
                      Mantén el enfoque con intervalos de 25 minutos
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    4
                  </div>
                  <div>
                    <p className="text-sm font-medium">Genera sugerencias inteligentes</p>
                    <p className="text-xs text-muted-foreground">
                      Deja que la IA optimice tu calendario
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle>Consejos ADHD</CardTitle>
                </div>
                <CardDescription>Estrategias para mantenerte enfocado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  💡 <strong>Divide las tareas grandes</strong> - Usa el Pomodoro para trabajar en
                  bloques manejables
                </p>
                <p>
                  🎯 <strong>Sé consistente</strong> - Los hábitos diarios construyen momentum y
                  reducen la fricción
                </p>
                <p>
                  📊 <strong>Registra tus patrones</strong> - Conocer tu energía te ayuda a
                  planificar mejor
                </p>
                <p>
                  ✨ <strong>Confía en las sugerencias</strong> - La IA aprende de tus patrones
                  para optimizar tu día
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
