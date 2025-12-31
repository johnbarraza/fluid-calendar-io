"use client";

import * as React from "react";
import { LuPlus as Plus } from "react-icons/lu";
import { toast } from "sonner";
import { HabitDashboard } from "@/components/adhd/habits";
import { EmojiPicker } from "@/components/adhd/habits/EmojiPicker";
import { useHabitStore, NewHabit } from "@/store/adhd/habitStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function HabitsPage() {
  const { createHabit } = useHabitStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [emoji, setEmoji] = React.useState("");
  const [frequency, setFrequency] = React.useState<"DAILY" | "WEEKLY" | "CUSTOM">("DAILY");
  const [color, setColor] = React.useState("#3b82f6");

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("El nombre del hábito es requerido");
      return;
    }

    setIsCreating(true);

    try {
      const habitData: NewHabit = {
        name: name.trim(),
        description: description.trim() || undefined,
        emoji: emoji.trim() || undefined,
        frequency,
        color,
      };

      await createHabit(habitData);
      toast.success("Hábito creado exitosamente");

      // Reset form
      setName("");
      setDescription("");
      setEmoji("");
      setFrequency("DAILY");
      setColor("#3b82f6");
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error("Error al crear hábito");
      console.error("Failed to create habit:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hábitos</h1>
            <p className="text-sm text-muted-foreground">
              Construye rutinas positivas y haz seguimiento de tus rachas
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Hábito
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <HabitDashboard onCreateHabit={() => setIsCreateDialogOpen(true)} />
      </div>

      {/* Create Habit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateHabit}>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Hábito</DialogTitle>
              <DialogDescription>
                Define un hábito que quieras construir. Agrega un emoji para hacerlo más visual.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ej: Hacer ejercicio, Meditar, Leer..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Emoji */}
              <div className="grid gap-2">
                <Label htmlFor="emoji">Icono</Label>
                <div className="flex items-center gap-3">
                  <EmojiPicker value={emoji} onChange={setEmoji} />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Haz clic para seleccionar un icono o genera uno aleatorio
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="¿Por qué es importante este hábito para ti?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Frequency */}
              <div className="grid gap-2">
                <Label htmlFor="frequency">Frecuencia</Label>
                <Select
                  value={frequency}
                  onValueChange={(value) => setFrequency(value as "DAILY" | "WEEKLY" | "CUSTOM")}
                >
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Diario</SelectItem>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="CUSTOM">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Color */}
              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-20 cursor-pointer rounded-md border"
                  />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creando..." : "Crear Hábito"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
