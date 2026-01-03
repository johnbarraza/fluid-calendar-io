"use client";

import * as React from "react";
import { LuTrendingUp as TrendingUp, LuClock as Clock, LuTarget as Target, LuCalendar as Calendar } from "react-icons/lu";
import { PomodoroTimer } from "@/components/adhd/pomodoro";
import { usePomodoroStore } from "@/store/adhd/pomodoroStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PomodoroPage() {
  const { recentSessions, fetchRecentSessions, loading } = usePomodoroStore();
  const [stats, setStats] = React.useState({
    totalSessions: 0,
    focusTime: 0,
    completionRate: 0,
    todaySessions: 0,
  });

  React.useEffect(() => {
    fetchRecentSessions(7);
  }, [fetchRecentSessions]);

  React.useEffect(() => {
    if (recentSessions.length > 0) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const todaySessions = recentSessions.filter(
        (s) => new Date(s.startedAt) >= today && s.completed
      );

      const totalCompleted = recentSessions.filter((s) => s.completed).length;
      const totalSessions = recentSessions.length;

      const focusTime = recentSessions
        .filter((s) => s.type === "work" && s.completed)
        .reduce((acc, s) => {
          const start = new Date(s.startedAt);
          const end = s.endedAt ? new Date(s.endedAt) : new Date();
          return acc + (end.getTime() - start.getTime()) / 1000 / 60;
        }, 0);

      setStats({
        totalSessions: totalSessions,
        focusTime: Math.round(focusTime),
        completionRate: totalSessions > 0 ? (totalCompleted / totalSessions) * 100 : 0,
        todaySessions: todaySessions.length,
      });
    }
  }, [recentSessions]);

  const getSessionIcon = (type: string) => {
    return type === "work" ? "🎯" : "☕";
  };

  const getSessionLabel = (type: string) => {
    return type === "work" ? "Trabajo" : "Descanso";
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pomodoro</h1>
          <p className="text-sm text-muted-foreground">
            Mantén el enfoque con intervalos de trabajo y descanso
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Timer - Takes 1 column */}
          <div className="lg:col-span-1">
            <PomodoroTimer />
          </div>

          {/* Stats and History - Takes 2 columns */}
          <div className="space-y-6 lg:col-span-2">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Hoy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todaySessions}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.todaySessions === 1 ? "sesión" : "sesiones"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Tiempo de enfoque
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatDuration(stats.focusTime)}</div>
                  <p className="text-xs text-muted-foreground">últimos 7 días</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    Tasa de completado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(stats.completionRate)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {recentSessions.filter((s) => s.completed).length} de {stats.totalSessions}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Total sesiones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSessions}</div>
                  <p className="text-xs text-muted-foreground">últimos 7 días</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Sesiones Recientes</CardTitle>
                <CardDescription>Últimas 10 sesiones</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : recentSessions.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">
                    No hay sesiones aún. Empieza tu primera sesión Pomodoro.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentSessions.slice(0, 10).map((session) => {
                      if (!session.startedAt) return null;

                      const startDate = new Date(session.startedAt);
                      if (isNaN(startDate.getTime())) return null;

                      const duration = session.endedAt
                        ? Math.round(
                            (new Date(session.endedAt).getTime() -
                              startDate.getTime()) /
                              1000 /
                              60
                          )
                        : 0;

                      return (
                        <div
                          key={session.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getSessionIcon(session.type)}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {getSessionLabel(session.type)}
                                </p>
                                {session.completed ? (
                                  <Badge variant="default" className="bg-green-500/10 text-green-500">
                                    Completado
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Incompleto</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(startDate, "PPp", { locale: es })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatDuration(duration)}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.type === "work" ? "25 min" : "5 min"} objetivo
                            </p>
                          </div>
                        </div>
                      );
                    })}
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
