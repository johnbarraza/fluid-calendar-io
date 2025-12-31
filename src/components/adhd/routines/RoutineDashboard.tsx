"use client";

import * as React from "react";
import { LuFilter as Filter } from "react-icons/lu";
import { RoutineCard } from "./RoutineCard";
import { useRoutineStore, RoutineWithTasks } from "@/store/adhd/routineStore";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoutineDashboardProps {
  onEdit: (routine: RoutineWithTasks) => void;
  onDelete: (routine: RoutineWithTasks) => void;
  onCreateRoutine: () => void;
}

const CATEGORIES = [
  { value: "all", label: "Todas las categorías" },
  { value: "mañana", label: "Mañana" },
  { value: "noche", label: "Noche" },
  { value: "ejercicio", label: "Ejercicio" },
  { value: "estudio", label: "Estudio" },
  { value: "relajación", label: "Relajación" },
];

export function RoutineDashboard({
  onEdit,
  onDelete,
  onCreateRoutine,
}: RoutineDashboardProps) {
  const { routines, loading, fetchRoutines, toggleRoutineActive } =
    useRoutineStore();
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [showInactive, setShowInactive] = React.useState(true);

  React.useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const filteredRoutines = React.useMemo(() => {
    let filtered = routines;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }

    // Filter by active status
    if (!showInactive) {
      filtered = filtered.filter((r) => r.isActive);
    }

    return filtered;
  }, [routines, selectedCategory, showInactive]);

  const handleToggleActive = async (routine: RoutineWithTasks) => {
    try {
      await toggleRoutineActive(routine.id);
    } catch (error) {
      console.error("Failed to toggle routine:", error);
    }
  };

  if (loading && routines.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-4xl">⏳</div>
          <p className="text-sm text-muted-foreground">Cargando rutinas...</p>
        </div>
      </div>
    );
  }

  if (routines.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">📋</div>
          <h3 className="mb-2 text-lg font-semibold">No hay rutinas creadas</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Crea tu primera rutina para comenzar a organizar tus hábitos diarios.
          </p>
          <Button onClick={onCreateRoutine}>Crear Primera Rutina</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-inactive"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label
            htmlFor="show-inactive"
            className="cursor-pointer text-sm font-medium"
          >
            Mostrar inactivas
          </label>
        </div>
      </div>

      {/* Routines Grid */}
      {filteredRoutines.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              No se encontraron rutinas con los filtros seleccionados.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
