"use client";

import * as React from "react";
import { LuPlus as Plus, LuX as X } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmojiPicker } from "@/components/adhd/habits/EmojiPicker";
import { TaskList } from "./TaskList";
import { NewRoutine, NewRoutineTask } from "@/store/adhd/routineStore";

interface RoutineBuilderProps {
  initialData?: Partial<NewRoutine>;
  onSave: (routine: NewRoutine) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

const CATEGORIES = [
  { value: "mañana", label: "Mañana" },
  { value: "noche", label: "Noche" },
  { value: "ejercicio", label: "Ejercicio" },
  { value: "estudio", label: "Estudio" },
  { value: "relajación", label: "Relajación" },
];

export function RoutineBuilder({
  initialData,
  onSave,
  onCancel,
  isEdit = false,
}: RoutineBuilderProps) {
  const [name, setName] = React.useState(initialData?.name || "");
  const [description, setDescription] = React.useState(
    initialData?.description || ""
  );
  const [icon, setIcon] = React.useState(initialData?.icon || "");
  const [category, setCategory] = React.useState(initialData?.category || "");
  const [startTime, setStartTime] = React.useState(
    initialData?.startTime || "08:00"
  );
  const [tasks, setTasks] = React.useState<NewRoutineTask[]>(
    initialData?.tasks || []
  );
  const [saving, setSaving] = React.useState(false);

  const handleAddTask = () => {
    const newTask: NewRoutineTask = {
      name: "",
      icon: "✓",
      duration: 5,
      order: tasks.length,
      autoContinue: true,
      notes: "",
    };
    setTasks([...tasks, newTask]);
  };

  const handleUpdateTask = (index: number, updates: Partial<NewRoutineTask>) => {
    setTasks(
      tasks.map((task, i) => (i === index ? { ...task, ...updates } : task))
    );
  };

  const handleDeleteTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index).map((task, i) => ({ ...task, order: i })));
  };

  const handleReorderTasks = (reorderedTasks: NewRoutineTask[]) => {
    setTasks(reorderedTasks.map((task, i) => ({ ...task, order: i })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || tasks.length === 0) {
      return;
    }

    // Validate that all tasks have names
    const invalidTask = tasks.find((t) => !t.name.trim());
    if (invalidTask) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
        category: category || undefined,
        startTime,
        isActive: true,
        order: 0,
        tasks,
      });
    } finally {
      setSaving(false);
    }
  };

  const totalDuration = tasks.reduce((sum, task) => sum + task.duration, 0);

  const calculateEndTime = () => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMins = hours * 60 + minutes + totalDuration;
    const endHours = Math.floor(totalMins / 60) % 24;
    const endMinutes = totalMins % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información Básica</h3>

        {/* Name & Icon */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <Label>Icono</Label>
            <EmojiPicker value={icon} onChange={setIcon} />
          </div>

          <div className="flex-1 space-y-2">
            <Label htmlFor="name">
              Nombre de la Rutina <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ej: Rutina Mañana, Noche de Descanso..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Textarea
            id="description"
            placeholder="Describe el propósito de esta rutina..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Category & Start Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">
              Hora de Inicio <span className="text-destructive">*</span>
            </Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Duration Summary */}
        {tasks.length > 0 && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duración Total:</span>
              <span className="font-medium">{totalDuration} minutos</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hora de Finalización:</span>
              <span className="font-medium">{calculateEndTime()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Tareas {tasks.length > 0 && `(${tasks.length})`}
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddTask}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Tarea
          </Button>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-md border-2 border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no hay tareas. Agrega la primera tarea para comenzar a construir tu rutina.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTask}
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Primera Tarea
            </Button>
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onReorder={handleReorderTasks}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !name.trim() || tasks.length === 0}>
          {saving ? "Guardando..." : isEdit ? "Actualizar Rutina" : "Crear Rutina"}
        </Button>
      </div>
    </form>
  );
}
