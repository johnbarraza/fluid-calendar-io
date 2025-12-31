"use client";

import * as React from "react";
import { LuSmile as Smile, LuMeh as Meh, LuFrown as Frown, LuBattery as Battery, LuBatteryLow as BatteryLow, LuBatteryFull as BatteryFull } from "react-icons/lu";
import { useMoodStore } from "@/store/adhd/moodStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MoodLoggerProps {
  onSuccess?: () => void;
  compact?: boolean;
}

/**
 * MoodLogger Component
 *
 * Quick form for logging mood and energy levels
 * Features:
 * - Visual mood selector (1-5 scale with emoji)
 * - Visual energy selector (1-5 scale with battery icon)
 * - Optional notes field
 * - One-click submission
 * - Compact mode for sidebar
 */
export function MoodLogger({ onSuccess, compact = false }: MoodLoggerProps) {
  const { logMoodEntry, loading } = useMoodStore();
  const [mood, setMood] = React.useState<number | null>(null);
  const [energy, setEnergy] = React.useState<number | null>(null);
  const [notes, setNotes] = React.useState("");

  const moodOptions = [
    { value: 1, label: "Muy mal", icon: Frown, color: "text-red-500" },
    { value: 2, label: "Mal", icon: Frown, color: "text-orange-500" },
    { value: 3, label: "Normal", icon: Meh, color: "text-yellow-500" },
    { value: 4, label: "Bien", icon: Smile, color: "text-green-500" },
    { value: 5, label: "Excelente", icon: Smile, color: "text-emerald-500" },
  ];

  const energyOptions = [
    { value: 1, label: "Agotado", icon: BatteryLow, color: "text-red-500" },
    { value: 2, label: "Bajo", icon: BatteryLow, color: "text-orange-500" },
    { value: 3, label: "Moderado", icon: Battery, color: "text-yellow-500" },
    { value: 4, label: "Alto", icon: BatteryFull, color: "text-green-500" },
    { value: 5, label: "Muy alto", icon: BatteryFull, color: "text-emerald-500" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mood === null || energy === null) {
      toast.error("Por favor selecciona mood y energía");
      return;
    }

    try {
      await logMoodEntry({
        mood,
        energy,
        notes: notes.trim() || undefined,
      });

      toast.success("Mood registrado exitosamente");

      // Reset form
      setMood(null);
      setEnergy(null);
      setNotes("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error("Error al registrar mood");
      console.error("Failed to log mood:", error);
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">¿Cómo te sientes?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Mood selector */}
            <div className="flex justify-between">
              {moodOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMood(option.value)}
                    className={cn(
                      "rounded-full p-2 transition-all hover:scale-110",
                      mood === option.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                    title={option.label}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        mood === option.value ? "" : option.color
                      )}
                    />
                  </button>
                );
              })}
            </div>

            {/* Energy selector */}
            <div className="flex justify-between">
              {energyOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEnergy(option.value)}
                    className={cn(
                      "rounded-full p-2 transition-all hover:scale-110",
                      energy === option.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                    title={option.label}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        energy === option.value ? "" : option.color
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <Button
              type="submit"
              disabled={loading || mood === null || energy === null}
              className="w-full"
              size="sm"
            >
              {loading ? "Guardando..." : "Registrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Estado de Ánimo</CardTitle>
        <CardDescription>
          Lleva un seguimiento de cómo te sientes para identificar patrones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mood Section */}
          <div className="space-y-3">
            <Label>¿Cómo está tu ánimo? *</Label>
            <div className="flex justify-between gap-2">
              {moodOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMood(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg p-3 transition-all hover:scale-105",
                      mood === option.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6",
                        mood === option.value ? "" : option.color
                      )}
                    />
                    <span className="text-xs">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Energy Section */}
          <div className="space-y-3">
            <Label>¿Cómo está tu energía? *</Label>
            <div className="flex justify-between gap-2">
              {energyOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEnergy(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg p-3 transition-all hover:scale-105",
                      energy === option.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6",
                        energy === option.value ? "" : option.color
                      )}
                    />
                    <span className="text-xs">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="¿Qué está afectando tu estado hoy?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || mood === null || energy === null}
            className="w-full"
          >
            {loading ? "Guardando..." : "Registrar Estado"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
