import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MoodEntry } from "@/db/types";

/**
 * New mood entry data
 */
export interface NewMoodEntry {
  mood: number; // 1-5 scale
  energy: number; // 1-5 scale
  notes?: string;
  timestamp?: Date;
}

/**
 * Mood pattern analysis result
 */
export interface MoodPattern {
  averageMood: number;
  averageEnergy: number;
  bestTimeOfDay: string;
  worstTimeOfDay: string;
  moodTrend: "improving" | "declining" | "stable";
  energyTrend: "improving" | "declining" | "stable";
}

/**
 * Best work times recommendation
 */
export interface BestWorkTimes {
  morning: { score: number; recommended: boolean };
  afternoon: { score: number; recommended: boolean };
  evening: { score: number; recommended: boolean };
}

interface MoodState {
  entries: MoodEntry[];
  loading: boolean;
  error: Error | null;
  daysToShow: number; // How many days of history to fetch/display

  // Mood entry actions
  fetchMoodEntries: (days?: number) => Promise<void>;
  logMoodEntry: (entry: NewMoodEntry) => Promise<MoodEntry>;

  // Analysis actions
  fetchMoodPattern: () => Promise<MoodPattern>;
  fetchBestWorkTimes: () => Promise<BestWorkTimes>;

  // Helpers
  setDaysToShow: (days: number) => void;
  getLatestEntry: () => MoodEntry | null;
}

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      entries: [],
      loading: false,
      error: null,
      daysToShow: 7, // Default to last 7 days

      // Fetch mood entries for the specified number of days
      fetchMoodEntries: async (days?: number) => {
        const daysParam = days || get().daysToShow;
        set({ loading: true, error: null });

        try {
          const response = await fetch(`/api/adhd/mood?days=${daysParam}`);
          if (!response.ok) throw new Error("Failed to fetch mood entries");
          const entries = await response.json();
          set({ entries });
        } catch (error) {
          set({ error: error as Error });
        } finally {
          set({ loading: false });
        }
      },

      // Log new mood/energy entry
      logMoodEntry: async (entry: NewMoodEntry) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch("/api/adhd/mood", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mood: entry.mood,
              energyLevel: entry.energy,
              note: entry.notes,
            }),
          });

          if (!response.ok) throw new Error("Failed to log mood entry");
          const newEntry = await response.json();

          // Add new entry to the beginning of the list (most recent first)
          set((state) => ({
            entries: [newEntry, ...state.entries],
          }));

          return newEntry;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Fetch mood pattern analysis
      fetchMoodPattern: async () => {
        set({ error: null });
        try {
          const response = await fetch("/api/adhd/mood/pattern");
          if (!response.ok) throw new Error("Failed to fetch mood pattern");
          return await response.json();
        } catch (error) {
          set({ error: error as Error });
          throw error;
        }
      },

      // Fetch best work times recommendation
      fetchBestWorkTimes: async () => {
        set({ error: null });
        try {
          const response = await fetch("/api/adhd/mood/best-times");
          if (!response.ok)
            throw new Error("Failed to fetch best work times");
          return await response.json();
        } catch (error) {
          set({ error: error as Error });
          throw error;
        }
      },

      // Set how many days of history to show
      setDaysToShow: (days: number) => {
        set({ daysToShow: days });
      },

      // Get the most recent mood entry
      getLatestEntry: () => {
        const { entries } = get();
        return entries.length > 0 ? entries[0] : null;
      },
    }),
    {
      name: "adhd-mood-storage",
      partialize: (state) => ({
        // Persist last 7 days of entries only to keep storage size manageable
        entries: state.entries.slice(0, 50), // Max 50 entries in storage
        daysToShow: state.daysToShow,
      }),
    }
  )
);
