"use client";

import * as React from "react";
import {
  LuPlay as Play,
  LuPause as Pause,
  LuSkipForward as SkipForward,
  LuCheck as Check,
  LuX as X,
  LuClock as Clock,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RoutineWithTasks } from "@/store/adhd/routineStore";

interface RoutineExecutorProps {
  routine: RoutineWithTasks;
  onComplete: (notes?: string) => void;
  onAbandon: (reason?: string) => void;
}

export function RoutineExecutor({
  routine,
  onComplete,
  onAbandon,
}: RoutineExecutorProps) {
  const [currentTaskIndex, setCurrentTaskIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [timeLeft, setTimeLeft] = React.useState(
    routine.tasks[0]?.duration * 60 || 0
  ); // seconds
  const [completedTasks, setCompletedTasks] = React.useState(0);
  // Valid: Date.now() called only once during component initialization
  // eslint-disable-next-line react-hooks/purity
  const [sessionStartTime] = React.useState(Date.now());

  const currentTask = routine.tasks[currentTaskIndex];
  const totalTasks = routine.tasks.length;
  const overallProgress = (completedTasks / totalTasks) * 100;

  const handleTaskComplete = React.useCallback(() => {
    setCompletedTasks((prev) => {
      const newCompletedTasks = prev + 1;

      if (currentTaskIndex < totalTasks - 1) {
        // Move to next task
        const nextIndex = currentTaskIndex + 1;
        const nextTask = routine.tasks[nextIndex];

        setCurrentTaskIndex(nextIndex);
        setTimeLeft(nextTask.duration * 60);

        // Auto-continue if enabled
        if (!currentTask?.autoContinue) {
          setIsPlaying(false);
        }
      } else {
        // All tasks completed
        onComplete();
      }

      return newCompletedTasks;
    });
  }, [currentTaskIndex, totalTasks, currentTask?.autoContinue, onComplete, routine.tasks]);

  // Timer effect
  React.useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Task completed
          handleTaskComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, handleTaskComplete]);

  const handleSkipTask = () => {
    if (currentTaskIndex < totalTasks - 1) {
      const nextIndex = currentTaskIndex + 1;
      const nextTask = routine.tasks[nextIndex];

      setCurrentTaskIndex(nextIndex);
      setTimeLeft(nextTask.duration * 60);
      setCompletedTasks((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getElapsedTime = (): string => {
    // Timer functionality requires Date.now() - this is intentional
    // eslint-disable-next-line react-hooks/purity
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    return formatTime(elapsed);
  };

  const taskProgress =
    ((currentTask?.duration * 60 - timeLeft) / (currentTask?.duration * 60)) *
    100;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{routine.icon || "📋"}</span>
            <div>
              <h1 className="text-2xl font-bold">{routine.name}</h1>
              <p className="text-sm text-muted-foreground">
                Tarea {currentTaskIndex + 1} de {totalTasks}
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={() => onAbandon()}>
            <X className="mr-2 h-4 w-4" />
            Abandonar
          </Button>
        </div>

        {/* Overall Progress */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso General</span>
            <span className="font-medium">
              {completedTasks} / {totalTasks} tareas
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </div>

      {/* Current Task */}
      <div className="flex-1 overflow-auto p-6">
        <Card className="mx-auto max-w-2xl p-8">
          <div className="text-center">
            {/* Task Icon */}
            <div className="mb-4 text-6xl">{currentTask?.icon || "✓"}</div>

            {/* Task Name */}
            <h2 className="mb-2 text-3xl font-bold">{currentTask?.name}</h2>

            {/* Task Notes */}
            {currentTask?.notes && (
              <p className="mb-6 text-muted-foreground">{currentTask.notes}</p>
            )}

            {/* Timer */}
            <div className="my-8">
              <div className="mb-4 text-7xl font-bold tabular-nums">
                {formatTime(timeLeft)}
              </div>
              <Progress value={taskProgress} className="h-3" />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                variant={isPlaying ? "outline" : "default"}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Continuar
                  </>
                )}
              </Button>

              <Button size="lg" onClick={handleTaskComplete}>
                <Check className="mr-2 h-5 w-5" />
                Completar Tarea
              </Button>

              {currentTaskIndex < totalTasks - 1 && (
                <Button size="lg" variant="outline" onClick={handleSkipTask}>
                  <SkipForward className="mr-2 h-5 w-5" />
                  Saltar
                </Button>
              )}
            </div>

            {/* Session Info */}
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Tiempo transcurrido: {getElapsedTime()}</span>
              </div>
              {currentTask?.autoContinue && currentTaskIndex < totalTasks - 1 && (
                <div className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                  Auto-continuar activado
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Upcoming Tasks */}
        {currentTaskIndex < totalTasks - 1 && (
          <div className="mx-auto mt-6 max-w-2xl">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Próximas tareas
            </h3>
            <div className="space-y-2">
              {routine.tasks.slice(currentTaskIndex + 1, currentTaskIndex + 4).map(
                (task, index) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-md border bg-muted/30 p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {currentTaskIndex + index + 2}
                    </div>
                    <span className="text-xl">{task.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{task.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.duration} minutos
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
