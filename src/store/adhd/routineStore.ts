import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Routine, RoutineTask, RoutineWithTasks } from "@/db/types";

// Re-export for convenience
export type { RoutineWithTasks } from "@/db/types";

/**
 * New routine task data for creation
 */
export interface NewRoutineTask {
  name: string;
  icon?: string;
  duration: number; // Minutes
  order: number;
  autoContinue?: boolean;
  notes?: string;
}

/**
 * New routine data for creation
 */
export interface NewRoutine {
  name: string;
  description?: string;
  icon?: string;
  category?: string; // "mañana", "noche", "ejercicio", "estudio", "relajación"
  startTime: string; // HH:MM format
  isActive?: boolean;
  order?: number;
  tasks: NewRoutineTask[];
}

/**
 * Update routine data (all fields optional)
 */
export interface UpdateRoutine {
  name?: string;
  description?: string;
  icon?: string;
  category?: string;
  startTime?: string;
  isActive?: boolean;
  order?: number;
  tasks?: NewRoutineTask[];
}

interface RoutineState {
  routines: RoutineWithTasks[];
  loading: boolean;
  error: Error | null;

  // Routine actions
  fetchRoutines: (category?: string) => Promise<void>;
  createRoutine: (routine: NewRoutine) => Promise<RoutineWithTasks>;
  updateRoutine: (id: string, updates: UpdateRoutine) => Promise<RoutineWithTasks>;
  deleteRoutine: (id: string) => Promise<void>;
  toggleRoutineActive: (id: string) => Promise<RoutineWithTasks>;

  // Helpers
  getRoutineById: (id: string) => RoutineWithTasks | undefined;
  getRoutinesByCategory: (category: string) => RoutineWithTasks[];
  getActiveRoutines: () => RoutineWithTasks[];
  calculateRoutineDuration: (routine: RoutineWithTasks) => number;
  getRoutineEndTime: (routine: RoutineWithTasks) => string;
}

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set, get) => ({
      routines: [],
      loading: false,
      error: null,

      // Fetch all routines (optionally filtered by category)
      fetchRoutines: async (category?: string) => {
        set({ loading: true, error: null });
        try {
          const url = category
            ? `/api/adhd/routines?category=${encodeURIComponent(category)}`
            : "/api/adhd/routines";

          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed to fetch routines");
          const routines = await response.json();
          set({ routines });
        } catch (error) {
          set({ error: error as Error });
        } finally {
          set({ loading: false });
        }
      },

      // Create new routine
      createRoutine: async (routine: NewRoutine) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch("/api/adhd/routines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(routine),
          });
          if (!response.ok) throw new Error("Failed to create routine");
          const newRoutine = await response.json();

          set((state) => ({
            routines: [...state.routines, newRoutine].sort((a, b) => {
              if (a.order !== b.order) return a.order - b.order;
              return a.startTime.localeCompare(b.startTime);
            }),
          }));

          return newRoutine;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Update existing routine
      updateRoutine: async (id: string, updates: UpdateRoutine) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/adhd/routines/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          if (!response.ok) throw new Error("Failed to update routine");
          const updatedRoutine = await response.json();

          set((state) => ({
            routines: state.routines
              .map((r) => (r.id === id ? updatedRoutine : r))
              .sort((a, b) => {
                if (a.order !== b.order) return a.order - b.order;
                return a.startTime.localeCompare(b.startTime);
              }),
          }));

          return updatedRoutine;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Delete routine
      deleteRoutine: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/adhd/routines/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Failed to delete routine");

          set((state) => ({
            routines: state.routines.filter((r) => r.id !== id),
          }));
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Toggle routine active/inactive status
      toggleRoutineActive: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/adhd/routines/${id}/toggle`, {
            method: "POST",
          });
          if (!response.ok) throw new Error("Failed to toggle routine");
          const updatedRoutine = await response.json();

          set((state) => ({
            routines: state.routines.map((r) =>
              r.id === id ? updatedRoutine : r
            ),
          }));

          return updatedRoutine;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Get a specific routine by ID
      getRoutineById: (id: string) => {
        return get().routines.find((r) => r.id === id);
      },

      // Get routines by category
      getRoutinesByCategory: (category: string) => {
        return get().routines.filter((r) => r.category === category);
      },

      // Get only active routines
      getActiveRoutines: () => {
        return get().routines.filter((r) => r.isActive);
      },

      // Calculate total duration of a routine (sum of all task durations)
      calculateRoutineDuration: (routine: RoutineWithTasks) => {
        return routine.tasks.reduce((total, task) => total + task.duration, 0);
      },

      // Calculate routine end time based on start time and total duration
      getRoutineEndTime: (routine: RoutineWithTasks) => {
        const totalMinutes = get().calculateRoutineDuration(routine);
        const [hours, minutes] = routine.startTime.split(":").map(Number);

        const totalMins = hours * 60 + minutes + totalMinutes;
        const endHours = Math.floor(totalMins / 60) % 24;
        const endMinutes = totalMins % 60;

        return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
      },
    }),
    {
      name: "adhd-routine-storage",
      partialize: (state) => ({
        // Only persist routines, not loading/error states
        routines: state.routines,
      }),
    }
  )
);
