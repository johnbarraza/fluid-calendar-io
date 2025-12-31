"use client";

import * as React from "react";
import { LuPlay as Play, LuPause as Pause, LuSquare as Square, LuSkipForward as SkipForward } from "react-icons/lu";
import { usePomodoroStore } from "@/store/adhd/pomodoroStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PomodoroTimerProps {
  taskId?: string;
  onSessionComplete?: () => void;
}

/**
 * PomodoroTimer Component
 *
 * Interactive Pomodoro timer with:
 * - Circular progress visualization
 * - Start/Pause/Stop controls
 * - Auto-switch between work and break sessions
 * - Session statistics
 * - Browser notifications (optional)
 */
export function PomodoroTimer({ taskId, onSessionComplete }: PomodoroTimerProps) {
  const {
    activeSession,
    startSession,
    completeSession,
    interruptSession,
    fetchActiveSession,
    loading,
  } = usePomodoroStore();

  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch active session on mount
  React.useEffect(() => {
    fetchActiveSession();
  }, [fetchActiveSession]);

  // Calculate time remaining
  React.useEffect(() => {
    if (!activeSession) {
      setTimeRemaining(0);
      return;
    }

    const updateTime = () => {
      const now = new Date();
      const startTime = new Date(activeSession.startedAt);
      const duration = activeSession.workDuration * 60 * 1000; // Convert minutes to milliseconds
      const elapsed = now.getTime() - startTime.getTime();
      const remaining = Math.max(0, duration - elapsed);

      setTimeRemaining(remaining);

      // Auto-complete when timer reaches zero
      if (remaining === 0 && !isPaused) {
        handleComplete();
      }
    };

    updateTime();

    if (!isPaused) {
      timerRef.current = setInterval(updateTime, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeSession, isPaused]);

  const handleStart = async () => {
    try {
      await startSession({
        taskId: taskId || undefined,
        workDuration: 25,
        breakDuration: 5,
        type: "work",
      });
      toast.success("Sesión Pomodoro iniciada");
    } catch (error: any) {
      const errorMessage = error.message || "Error al iniciar sesión";
      toast.error(errorMessage);
      console.error("Failed to start session:", error);
    }
  };

  const handleComplete = async () => {
    if (!activeSession) return;

    try {
      await completeSession(activeSession.id);
      toast.success("¡Sesión completada! 🎉");

      if (onSessionComplete) {
        onSessionComplete();
      }

      // Optional: Show notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Pomodoro Completado", {
          body: "¡Buen trabajo! Toma un descanso.",
          icon: "/logo.svg",
        });
      }
    } catch (error) {
      toast.error("Error al completar sesión");
      console.error("Failed to complete session:", error);
    }
  };

  const handleStop = async () => {
    if (!activeSession) return;

    try {
      await interruptSession(activeSession.id, "Usuario detuvo el timer");
      toast.info("Sesión interrumpida");
    } catch (error) {
      toast.error("Error al detener sesión");
      console.error("Failed to stop session:", error);
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    toast.info(isPaused ? "Timer reanudado" : "Timer pausado");
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getProgress = () => {
    if (!activeSession || timeRemaining === 0) return 100;
    const duration = activeSession.workDuration * 60 * 1000;
    const elapsed = duration - timeRemaining;
    return (elapsed / duration) * 100;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pomodoro Timer</CardTitle>
        <CardDescription>
          {activeSession
            ? `Sesión ${activeSession.type === "work" ? "de trabajo" : "de descanso"}`
            : "Inicia una sesión de enfoque"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Circular timer */}
          <div className="relative flex h-48 w-48 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - getProgress() / 100)}`}
                className={cn(
                  "transition-all duration-1000",
                  activeSession?.type === "work" ? "text-blue-500" : "text-green-500"
                )}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-bold">
                {activeSession ? formatTime(timeRemaining) : "25:00"}
              </span>
              {isPaused && (
                <span className="text-xs text-muted-foreground">PAUSADO</span>
              )}
            </div>
          </div>

          {/* Progress bar (alternative visualization) */}
          {activeSession && (
            <div className="w-full space-y-2">
              <Progress value={getProgress()} className="h-2" />
              <p className="text-center text-xs text-muted-foreground">
                {Math.round(getProgress())}% completado
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          {!activeSession ? (
            <Button
              onClick={handleStart}
              disabled={loading}
              size="lg"
              className="min-w-[140px]"
            >
              <Play className="mr-2 h-5 w-5" />
              Iniciar
            </Button>
          ) : (
            <>
              <Button
                onClick={handlePauseResume}
                variant="outline"
                size="lg"
              >
                {isPaused ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Reanudar
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pausar
                  </>
                )}
              </Button>
              <Button
                onClick={handleStop}
                variant="destructive"
                size="lg"
              >
                <Square className="mr-2 h-4 w-4" />
                Detener
              </Button>
              <Button
                onClick={handleComplete}
                variant="default"
                size="lg"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Completar
              </Button>
            </>
          )}
        </div>

        {/* Session info */}
        {activeSession && (
          <div className="rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground">
            <p>
              Sesión de {activeSession.workDuration} min
              {taskId && " • Vinculado a tarea"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
