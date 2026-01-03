"use client";

import * as React from "react";
import { LuCircleCheck as CheckCircle2, LuCircle as Circle, LuFlame as Flame } from "react-icons/lu";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHabitStore, HabitWithStats } from "@/store/adhd/habitStore";
import { toast } from "sonner";

interface HabitCardProps {
  habit: HabitWithStats;
  onEdit?: (habit: HabitWithStats) => void;
  onDelete?: (habitId: string) => void;
}

/**
 * HabitCard Component
 *
 * Displays a single habit with:
 * - Habit name and emoji
 * - Current streak indicator
 * - Completion status for today
 * - Quick log button
 * - Frequency badge
 */
export function HabitCard({ habit, onEdit, onDelete }: HabitCardProps) {
  const { logHabit, isCompletedToday } = useHabitStore();
  const [isLogging, setIsLogging] = React.useState(false);

  const completedToday = isCompletedToday(habit.id);
  const currentStreak = habit.currentStreak || 0;

  const handleLogCompletion = async () => {
    if (completedToday) {
      toast.info("Ya completaste este hábito hoy");
      return;
    }

    setIsLogging(true);
    try {
      await logHabit(habit.id);
      toast.success(`¡${habit.name} completado! 🎉`);
    } catch (error) {
      toast.error("Error al registrar el hábito");
      console.error("Failed to log habit:", error);
    } finally {
      setIsLogging(false);
    }
  };

  const getFrequencyText = () => {
    if (habit.frequency === "DAILY") return "Diario";
    if (habit.frequency === "WEEKLY") return "Semanal";
    return "Personalizado";
  };

  const getFrequencyColor = () => {
    if (habit.frequency === "DAILY") return "bg-blue-500/10 text-blue-500";
    if (habit.frequency === "WEEKLY") return "bg-green-500/10 text-green-500";
    return "bg-purple-500/10 text-purple-500";
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        completedToday && "border-green-500/50 bg-green-500/5"
      )}
      style={
        habit.color
          ? {
              borderLeftWidth: "4px",
              borderLeftColor: habit.color,
            }
          : undefined
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {habit.icon && (
              <span className="text-2xl" role="img" aria-label="habit-emoji">
                {habit.icon}
              </span>
            )}
            <div>
              <CardTitle className="text-lg">{habit.name}</CardTitle>
              {habit.description && (
                <CardDescription className="mt-1">
                  {habit.description}
                </CardDescription>
              )}
            </div>
          </div>

          {completedToday && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          {/* Streak Indicator */}
          <div className="flex items-center gap-2">
            <Flame
              className={cn(
                "h-5 w-5",
                currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"
              )}
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{currentStreak}</span>
              <span className="text-xs text-muted-foreground">
                día{currentStreak !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Frequency Badge */}
          <Badge variant="secondary" className={cn("text-xs", getFrequencyColor())}>
            {getFrequencyText()}
          </Badge>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleLogCompletion}
          disabled={completedToday || isLogging}
          className="mt-4 w-full"
          variant={completedToday ? "secondary" : "default"}
          size="sm"
        >
          {isLogging ? (
            "Registrando..."
          ) : completedToday ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Completado hoy
            </>
          ) : (
            <>
              <Circle className="mr-2 h-4 w-4" />
              Marcar como completado
            </>
          )}
        </Button>

        {/* Edit/Delete Actions (optional) */}
        {(onEdit || onDelete) && (
          <div className="mt-2 flex gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(habit)}
                className="flex-1 text-xs"
              >
                Editar
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(habit.id)}
                className="flex-1 text-xs text-destructive"
              >
                Archivar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
