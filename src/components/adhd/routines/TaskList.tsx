"use client";

import * as React from "react";
import {
  LuGripVertical as GripVertical,
  LuTrash2 as Trash,
  LuClock as Clock,
  LuArrowRight as ArrowRight,
} from "react-icons/lu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/adhd/habits/EmojiPicker";
import { NewRoutineTask } from "@/store/adhd/routineStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskListProps {
  tasks: NewRoutineTask[];
  onUpdateTask: (index: number, updates: Partial<NewRoutineTask>) => void;
  onDeleteTask: (index: number) => void;
  onReorder: (reorderedTasks: NewRoutineTask[]) => void;
}

export function TaskList({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onReorder,
}: TaskListProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTasks = [...tasks];
    const draggedTask = newTasks[draggedIndex];
    newTasks.splice(draggedIndex, 1);
    newTasks.splice(index, 0, draggedTask);

    setDraggedIndex(index);
    onReorder(newTasks);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => {
        const isExpanded = expandedIndex === index;
        const isDragging = draggedIndex === index;

        return (
          <div
            key={index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`rounded-lg border bg-card transition-all ${
              isDragging ? "opacity-50" : ""
            }`}
          >
            {/* Task Header - Always Visible */}
            <div className="flex items-center gap-3 p-4">
              {/* Drag Handle */}
              <button
                type="button"
                className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                aria-label="Reorder task"
              >
                <GripVertical className="h-5 w-5" />
              </button>

              {/* Task Number */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </div>

              {/* Task Name */}
              <div className="flex-1">
                <Input
                  placeholder="Nombre de la tarea..."
                  value={task.name}
                  onChange={(e) => onUpdateTask(index, { name: e.target.value })}
                  className="border-0 bg-transparent p-0 focus-visible:ring-0"
                  required
                />
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{task.duration} min</span>
              </div>

              {/* Auto-Continue Indicator */}
              {task.autoContinue && index < tasks.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}

              {/* Expand/Collapse */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                {isExpanded ? "Menos" : "Más"}
              </Button>

              {/* Delete */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDeleteTask(index)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>

            {/* Task Details - Expanded */}
            {isExpanded && (
              <div className="border-t bg-muted/30 p-4">
                <div className="grid gap-4">
                  {/* Icon & Duration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icono</Label>
                      <EmojiPicker
                        value={task.icon || "✓"}
                        onChange={(icon) => onUpdateTask(index, { icon })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`duration-${index}`}>Duración (minutos)</Label>
                      <Select
                        value={String(task.duration)}
                        onValueChange={(value) =>
                          onUpdateTask(index, { duration: parseInt(value) })
                        }
                      >
                        <SelectTrigger id={`duration-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 min</SelectItem>
                          <SelectItem value="2">2 min</SelectItem>
                          <SelectItem value="3">3 min</SelectItem>
                          <SelectItem value="5">5 min</SelectItem>
                          <SelectItem value="10">10 min</SelectItem>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="20">20 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="45">45 min</SelectItem>
                          <SelectItem value="60">60 min</SelectItem>
                          <SelectItem value="90">90 min</SelectItem>
                          <SelectItem value="120">120 min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Auto-Continue */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`auto-continue-${index}`}
                      checked={task.autoContinue ?? true}
                      onChange={(e) =>
                        onUpdateTask(index, { autoContinue: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label
                      htmlFor={`auto-continue-${index}`}
                      className="cursor-pointer font-normal"
                    >
                      Continuar automáticamente a la siguiente tarea
                    </Label>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor={`notes-${index}`}>Notas (opcional)</Label>
                    <Textarea
                      id={`notes-${index}`}
                      placeholder="Instrucciones, recordatorios, contexto..."
                      value={task.notes || ""}
                      onChange={(e) => onUpdateTask(index, { notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
