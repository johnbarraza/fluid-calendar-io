import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PomodoroSession } from "@/db/types";

/**
 * Pomodoro configuration
 */
export interface PomodoroConfig {
  workDuration?: number; // minutes, default 25
  breakDuration?: number; // minutes, default 5
  type?: "work" | "shortBreak" | "longBreak";
}

/**
 * New Pomodoro session data
 */
export interface NewPomodoroSession {
  taskId?: string;
  workDuration?: number;
  breakDuration?: number;
  type?: "work" | "shortBreak" | "longBreak";
}

/**
 * Pomodoro productivity stats
 */
export interface PomodoroStats {
  totalSessions: number;
  completedSessions: number;
  interruptedSessions: number;
  totalFocusTime: number; // minutes
  averageSessionLength: number; // minutes
  completionRate: number; // percentage
  sessionsToday: number;
  focusTimeToday: number; // minutes
}

interface PomodoroState {
  activeSession: PomodoroSession | null;
  recentSessions: PomodoroSession[];
  loading: boolean;
  error: Error | null;

  // Session actions
  startSession: (config: NewPomodoroSession) => Promise<PomodoroSession>;
  completeSession: (sessionId: string) => Promise<PomodoroSession>;
  interruptSession: (sessionId: string, reason?: string) => Promise<PomodoroSession>;

  // Fetch actions
  fetchActiveSession: () => Promise<void>;
  fetchRecentSessions: (days?: number) => Promise<void>;
  fetchStats: () => Promise<PomodoroStats>;

  // Helper actions
  clearActiveSession: () => void;
  isSessionActive: () => boolean;
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      recentSessions: [],
      loading: false,
      error: null,

      // Start a new Pomodoro session
      startSession: async (config: NewPomodoroSession) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch("/api/adhd/pomodoro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || "Failed to start Pomodoro session");
          }

          const newSession = await response.json();
          set({ activeSession: newSession });
          return newSession;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Complete the active session
      completeSession: async (sessionId: string) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch(
            `/api/adhd/pomodoro/${sessionId}/complete`,
            {
              method: "POST",
            }
          );

          if (!response.ok) throw new Error("Failed to complete Pomodoro session");
          const completedSession = await response.json();

          // Clear active session and add to recent sessions
          set((state) => ({
            activeSession: null,
            recentSessions: [completedSession, ...state.recentSessions],
          }));

          return completedSession;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Interrupt the active session
      interruptSession: async (sessionId: string, reason?: string) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch(
            `/api/adhd/pomodoro/${sessionId}/interrupt`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason }),
            }
          );

          if (!response.ok)
            throw new Error("Failed to interrupt Pomodoro session");
          const interruptedSession = await response.json();

          // Clear active session and add to recent sessions
          set((state) => ({
            activeSession: null,
            recentSessions: [interruptedSession, ...state.recentSessions],
          }));

          return interruptedSession;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Fetch active session (if exists) from API
      // IMPORTANT: Always fetch from API, never persist active session
      fetchActiveSession: async () => {
        set({ loading: true, error: null });

        try {
          const response = await fetch("/api/adhd/pomodoro?days=1");
          if (!response.ok) throw new Error("Failed to fetch Pomodoro sessions");

          const sessions = await response.json();

          // Find the most recent active session (not completed, not interrupted)
          const activeSession = sessions.find(
            (s: PomodoroSession) => !s.completed && !s.interrupted
          );

          set({ activeSession: activeSession || null });
        } catch (error) {
          set({ error: error as Error });
        } finally {
          set({ loading: false });
        }
      },

      // Fetch recent sessions for history
      fetchRecentSessions: async (days = 7) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch(`/api/adhd/pomodoro?days=${days}`);
          if (!response.ok) throw new Error("Failed to fetch Pomodoro sessions");
          const sessions = await response.json();
          set({ recentSessions: sessions });
        } catch (error) {
          set({ error: error as Error });
        } finally {
          set({ loading: false });
        }
      },

      // Fetch productivity statistics
      fetchStats: async () => {
        set({ error: null });

        try {
          const response = await fetch("/api/adhd/pomodoro/stats");
          if (!response.ok) throw new Error("Failed to fetch Pomodoro stats");
          return await response.json();
        } catch (error) {
          set({ error: error as Error });
          throw error;
        }
      },

      // Clear active session (used after completion/interruption)
      clearActiveSession: () => {
        set({ activeSession: null });
      },

      // Check if there's an active session
      isSessionActive: () => {
        return get().activeSession !== null;
      },
    }),
    {
      name: "adhd-pomodoro-storage",
      partialize: (state) => ({
        // IMPORTANT: Only persist recent sessions, NOT active session
        // Active session must always be reconstructed from API on app load
        recentSessions: state.recentSessions.slice(0, 20), // Max 20 recent sessions
      }),
    }
  )
);
