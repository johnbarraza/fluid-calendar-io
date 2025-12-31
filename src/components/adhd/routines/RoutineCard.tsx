"use client";

import * as React from "react";
import {
  LuClock as Clock,
  LuMoreVertical as MoreVertical,
  LuPencil as Pencil,
  LuTrash2 as Trash,
  LuPower as Power,
  LuCheckCircle2 as CheckCircle,
} from "react-icons/lu";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoutineWithTasks } from "@/store/adhd/routineStore";

interface RoutineCardProps {
  routine: RoutineWithTasks;
  onEdit: (routine: RoutineWithTasks) => void;
  onDelete: (routine: RoutineWithTasks) => void;
  onToggleActive: (routine: RoutineWithTasks) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  mañana: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  noche: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  ejercicio: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  estudio: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  relajación: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export function RoutineCard({
  routine,
  onEdit,
  onDelete,
  onToggleActive,
}: RoutineCardProps) {
  const totalDuration = routine.tasks.reduce((sum, task) => sum + task.duration, 0);

  const calculateEndTime = () => {
    const [hours, minutes] = routine.startTime.split(":").map(Number);
    const totalMins = hours * 60 + minutes + totalDuration;
    const endHours = Math.floor(totalMins / 60) % 24;
    const endMinutes = totalMins % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  };

  return (
    <Card
      className={`overflow-hidden transition-all ${
        routine.isActive ? "" : "opacity-60"
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
              {routine.icon || "📋"}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{routine.name}</h3>
                {!routine.isActive && (
                  <Badge variant="outline" className="text-xs">
                    Inactiva
                  </Badge>
                )}
              </div>
              {routine.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {routine.description}
                </p>
              )}

              {/* Category & Time */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {routine.category && (
                  <Badge
                    variant="secondary"
                    className={CATEGORY_COLORS[routine.category] || ""}
                  >
                    {routine.category}
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {routine.startTime} - {calculateEndTime()}
                  </span>
                  <span className="mx-1">•</span>
                  <span>{totalDuration} min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(routine)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(routine)}>
                <Power className="mr-2 h-4 w-4" />
                {routine.isActive ? "Desactivar" : "Activar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(routine)}
                className="text-destructive focus:text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tasks List */}
        {routine.tasks.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              Tareas ({routine.tasks.length})
            </h4>
            <div className="space-y-1.5">
              {routine.tasks.slice(0, 3).map((task, index) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-sm"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <span className="text-lg">{task.icon || "✓"}</span>
                  <span className="flex-1 truncate">{task.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {task.duration}m
                  </span>
                </div>
              ))}
              {routine.tasks.length > 3 && (
                <div className="text-center text-xs text-muted-foreground">
                  +{routine.tasks.length - 3} tareas más
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
