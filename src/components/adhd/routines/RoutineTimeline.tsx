"use client";

import * as React from "react";
import {
  LuClock as Clock,
  LuPlay as Play,
  LuCheck as CheckCircle,
} from "react-icons/lu";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoutineWithTasks } from "@/store/adhd/routineStore";

interface RoutineTimelineProps {
  routines: RoutineWithTasks[];
  onStartRoutine?: (routine: RoutineWithTasks) => void;
}

interface TimelineBlock {
  routine: RoutineWithTasks;
  startMinutes: number; // Minutes from 00:00
  endMinutes: number;
  duration: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  mañana: "bg-yellow-500/20 border-yellow-500",
  noche: "bg-indigo-500/20 border-indigo-500",
  ejercicio: "bg-green-500/20 border-green-500",
  estudio: "bg-blue-500/20 border-blue-500",
  relajación: "bg-purple-500/20 border-purple-500",
};

export function RoutineTimeline({
  routines,
  onStartRoutine,
}: RoutineTimelineProps) {
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Update current time every minute
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Convert time string (HH:MM) to minutes from midnight
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to time string (HH:MM)
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  // Calculate timeline blocks from routines
  const timelineBlocks = React.useMemo(() => {
    const blocks: TimelineBlock[] = [];

    routines
      .filter((r) => r.isActive)
      .forEach((routine) => {
        const duration = routine.tasks.reduce(
          (sum, task) => sum + task.duration,
          0
        );
        const startMinutes = timeToMinutes(routine.startTime);
        const endMinutes = startMinutes + duration;

        blocks.push({
          routine,
          startMinutes,
          endMinutes,
          duration,
        });
      });

    // Sort by start time
    return blocks.sort((a, b) => a.startMinutes - b.startMinutes);
  }, [routines]);

  // Current time in minutes
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Find current or next routine
  const currentBlock = timelineBlocks.find(
    (block) =>
      currentMinutes >= block.startMinutes && currentMinutes < block.endMinutes
  );

  const nextBlock = timelineBlocks.find(
    (block) => currentMinutes < block.startMinutes
  );

  // Timeline hours (6 AM to 11 PM)
  const startHour = 6;
  const endHour = 23;
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );

  if (timelineBlocks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-4xl mb-2">📅</div>
        <p className="text-muted-foreground">
          No hay rutinas activas programadas para hoy
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Ahora</p>
              <p className="font-semibold">
                {currentTime.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {currentBlock ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">En progreso</p>
                <p className="font-semibold">{currentBlock.routine.name}</p>
              </div>
              <Badge variant="default" className="animate-pulse">
                Activa
              </Badge>
            </div>
          ) : nextBlock ? (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Próxima rutina</p>
              <p className="font-semibold">
                {nextBlock.routine.name} a las {nextBlock.routine.startTime}
              </p>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                No hay más rutinas hoy
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Timeline Visualization */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Timeline del Día</h3>

        <div className="relative">
          {/* Hour markers */}
          <div className="flex border-b border-border pb-2 mb-4">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-xs text-muted-foreground text-center"
              >
                {hour}:00
              </div>
            ))}
          </div>

          {/* Current time indicator */}
          {currentMinutes >= startHour * 60 &&
            currentMinutes <= endHour * 60 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{
                  left: `${((currentMinutes - startHour * 60) / ((endHour - startHour) * 60)) * 100}%`,
                }}
              >
                <div className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-red-500" />
              </div>
            )}

          {/* Routine blocks */}
          <div className="relative h-24 mb-4">
            {timelineBlocks.map((block) => {
              const left =
                ((block.startMinutes - startHour * 60) /
                  ((endHour - startHour) * 60)) *
                100;
              const width =
                (block.duration / ((endHour - startHour) * 60)) * 100;

              const isActive =
                currentMinutes >= block.startMinutes &&
                currentMinutes < block.endMinutes;
              const isPast = currentMinutes >= block.endMinutes;

              return (
                <div
                  key={block.routine.id}
                  className={`absolute top-0 h-full rounded-md border-2 p-2 cursor-pointer transition-all hover:shadow-md ${
                    CATEGORY_COLORS[block.routine.category || ""] ||
                    "bg-gray-500/20 border-gray-500"
                  } ${isActive ? "ring-2 ring-primary" : ""} ${isPast ? "opacity-50" : ""}`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    minWidth: "60px",
                  }}
                  onClick={() => onStartRoutine?.(block.routine)}
                >
                  <div className="flex flex-col h-full justify-between overflow-hidden">
                    <div className="flex items-center gap-1">
                      <span className="text-lg">{block.routine.icon}</span>
                      <span className="text-xs font-medium truncate">
                        {block.routine.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {block.duration}m
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Routine list */}
          <div className="space-y-2 mt-6">
            {timelineBlocks.map((block) => {
              const isActive =
                currentMinutes >= block.startMinutes &&
                currentMinutes < block.endMinutes;
              const isPast = currentMinutes >= block.endMinutes;

              return (
                <div
                  key={block.routine.id}
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : isPast
                        ? "opacity-50"
                        : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isPast ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : isActive ? (
                      <Play className="h-5 w-5 text-primary animate-pulse" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{block.routine.icon}</span>
                      <div>
                        <p className="font-medium">{block.routine.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {block.routine.startTime} -{" "}
                          {minutesToTime(block.endMinutes)} ({block.duration}{" "}
                          min)
                        </p>
                      </div>
                    </div>

                    {block.routine.category && (
                      <Badge variant="secondary">
                        {block.routine.category}
                      </Badge>
                    )}
                  </div>

                  {!isPast && onStartRoutine && (
                    <Button
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      onClick={() => onStartRoutine(block.routine)}
                    >
                      {isActive ? "Continuar" : "Iniciar"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
