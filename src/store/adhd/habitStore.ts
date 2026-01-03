import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Habit, HabitLog } from "@/db/types";

/**
 * Extended Habit type with computed properties
 */
export interface HabitWithStats extends Omit<Habit, 'currentStreak'> {
  currentStreak?: number | undefined;
  completedToday?: boolean;
  logs?: HabitLog[];
}

/**
 * New habit data for creation
 */
export interface NewHabit {
  name: string;
  description?: string;
  emoji?: string;
  frequency: "DAILY" | "WEEKLY" | "CUSTOM";
  targetDays?: number[];
  reminderTime?: string;
  color?: string;
}

/**
 * Habit statistics
 */
export interface HabitStats {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number;
  lastCompletedAt: Date | null;
}

interface HabitState {
  habits: HabitWithStats[];
  loading: boolean;
  error: Error | null;

  // Habit actions
  fetchHabits: () => Promise<void>;
  createHabit: (habit: NewHabit) => Promise<Habit>;
  updateHabit: (id: string, updates: Partial<NewHabit>) => Promise<Habit>;
  deleteHabit: (id: string) => Promise<void>;

  // Habit logging actions (with optimistic updates)
  logHabit: (habitId: string, date?: Date) => Promise<HabitLog>;

  // Habit stats
  fetchHabitStats: (habitId: string) => Promise<HabitStats>;

  // Helper to check if habit is completed today
  isCompletedToday: (habitId: string) => boolean;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      habits: [],
      loading: false,
      error: null,

      // Fetch all active habits
      fetchHabits: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch("/api/adhd/habits");
          if (!response.ok) throw new Error("Failed to fetch habits");
          const habits = await response.json();
          set({ habits });
        } catch (error) {
          set({ error: error as Error });
        } finally {
          set({ loading: false });
        }
      },

      // Create new habit
      createHabit: async (habit: NewHabit) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch("/api/adhd/habits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(habit),
          });
          if (!response.ok) throw new Error("Failed to create habit");
          const newHabit = await response.json();
          set((state) => ({ habits: [...state.habits, newHabit] }));
          return newHabit;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Update existing habit
      updateHabit: async (id: string, updates: Partial<NewHabit>) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/adhd/habits/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          if (!response.ok) throw new Error("Failed to update habit");
          const updatedHabit = await response.json();
          set((state) => ({
            habits: state.habits.map((h) => (h.id === id ? updatedHabit : h)),
          }));
          return updatedHabit;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Archive habit (soft delete)
      deleteHabit: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/adhd/habits/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Failed to archive habit");
          set((state) => ({
            habits: state.habits.filter((h) => h.id !== id),
          }));
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Log habit completion with optimistic update
      logHabit: async (habitId: string, date?: Date) => {
        // Optimistic update: mark as completed immediately
        const now = date || new Date();
        const optimisticLog = {
          id: `temp-${Date.now()}`,
          habitId,
          completedAt: now,
          date: now,
          note: null,
          mood: null,
        } as HabitLog;

        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === habitId
              ? {
                  ...h,
                  completedToday: true,
                  currentStreak: (h.currentStreak || 0) + 1,
                  logs: [...(h.logs || []), optimisticLog],
                }
              : h
          ),
        }));

        try {
          const response = await fetch(`/api/adhd/habits/${habitId}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completedAt: date }),
          });

          if (!response.ok) throw new Error("Failed to log habit");
          const realLog = await response.json();

          // Replace optimistic log with real one
          set((state) => ({
            habits: state.habits.map((h) =>
              h.id === habitId
                ? {
                    ...h,
                    logs: [
                      ...(h.logs || []).filter((l) => l.id !== optimisticLog.id),
                      realLog,
                    ],
                  }
                : h
            ),
          }));

          return realLog;
        } catch (error) {
          // Rollback optimistic update on error
          set((state) => ({
            habits: state.habits.map((h) =>
              h.id === habitId
                ? {
                    ...h,
                    completedToday: false,
                    currentStreak: Math.max(0, (h.currentStreak || 0) - 1),
                    logs: (h.logs || []).filter((l) => l.id !== optimisticLog.id),
                  }
                : h
            ),
            error: error as Error,
          }));
          throw error;
        }
      },

      // Fetch detailed stats for a specific habit
      fetchHabitStats: async (habitId: string) => {
        try {
          const response = await fetch(`/api/adhd/habits/${habitId}/stats`);
          if (!response.ok) throw new Error("Failed to fetch habit stats");
          return await response.json();
        } catch (error) {
          set({ error: error as Error });
          throw error;
        }
      },

      // Check if habit is completed today
      isCompletedToday: (habitId: string) => {
        const habit = get().habits.find((h) => h.id === habitId);
        return habit?.completedToday || false;
      },
    }),
    {
      name: "adhd-habit-storage",
      partialize: (state) => ({
        // Only persist habits, not loading/error states
        habits: state.habits,
      }),
    }
  )
);
