import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ScheduleSuggestion, Task } from "@prisma/client";

/**
 * Extended suggestion with task details
 */
export interface SuggestionWithTask extends ScheduleSuggestion {
  task?: Task;
}

/**
 * Suggestion status filter
 */
export type SuggestionStatus = "pending" | "accepted" | "rejected";

interface SuggestionState {
  suggestions: SuggestionWithTask[];
  loading: boolean;
  error: Error | null;
  statusFilter: SuggestionStatus;

  // Suggestion actions
  fetchSuggestions: (status?: SuggestionStatus) => Promise<void>;
  generateSuggestions: () => Promise<SuggestionWithTask[]>;
  acceptSuggestion: (suggestionId: string) => Promise<ScheduleSuggestion>;
  rejectSuggestion: (suggestionId: string) => Promise<ScheduleSuggestion>;

  // Filter actions
  setStatusFilter: (status: SuggestionStatus) => void;

  // Helpers
  getPendingSuggestions: () => SuggestionWithTask[];
  getSuggestionById: (id: string) => SuggestionWithTask | undefined;
  clearSuggestions: () => void;
}

export const useSuggestionStore = create<SuggestionState>()(
  persist(
    (set, get) => ({
      suggestions: [],
      loading: false,
      error: null,
      statusFilter: "pending",

      // Fetch suggestions by status
      fetchSuggestions: async (status?: SuggestionStatus) => {
        const statusParam = status || get().statusFilter;
        set({ loading: true, error: null });

        try {
          const response = await fetch(
            `/api/adhd/suggestions?status=${statusParam}`
          );
          if (!response.ok) throw new Error("Failed to fetch suggestions");
          const suggestions = await response.json();
          set({ suggestions });
        } catch (error) {
          set({ error: error as Error });
        } finally {
          set({ loading: false });
        }
      },

      // Generate new suggestions for conflicting/deadline tasks
      generateSuggestions: async () => {
        set({ loading: true, error: null });

        try {
          const response = await fetch("/api/adhd/suggestions", {
            method: "POST",
          });

          if (!response.ok) throw new Error("Failed to generate suggestions");
          const newSuggestions = await response.json();

          // Add new suggestions to the list
          set((state) => ({
            suggestions: [...newSuggestions, ...state.suggestions],
          }));

          return newSuggestions;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Accept a suggestion (reschedule the task)
      acceptSuggestion: async (suggestionId: string) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch(
            `/api/adhd/suggestions/${suggestionId}/accept`,
            {
              method: "POST",
            }
          );

          if (!response.ok) throw new Error("Failed to accept suggestion");
          const acceptedSuggestion = await response.json();

          // Update suggestion in store
          set((state) => ({
            suggestions: state.suggestions.map((s) =>
              s.id === suggestionId ? acceptedSuggestion : s
            ),
          }));

          // If filtering by pending, remove accepted suggestion from list
          if (get().statusFilter === "pending") {
            set((state) => ({
              suggestions: state.suggestions.filter(
                (s) => s.id !== suggestionId
              ),
            }));
          }

          return acceptedSuggestion;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Reject a suggestion
      rejectSuggestion: async (suggestionId: string) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch(
            `/api/adhd/suggestions/${suggestionId}/reject`,
            {
              method: "POST",
            }
          );

          if (!response.ok) throw new Error("Failed to reject suggestion");
          const rejectedSuggestion = await response.json();

          // Update suggestion in store
          set((state) => ({
            suggestions: state.suggestions.map((s) =>
              s.id === suggestionId ? rejectedSuggestion : s
            ),
          }));

          // If filtering by pending, remove rejected suggestion from list
          if (get().statusFilter === "pending") {
            set((state) => ({
              suggestions: state.suggestions.filter(
                (s) => s.id !== suggestionId
              ),
            }));
          }

          return rejectedSuggestion;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Set the status filter
      setStatusFilter: (status: SuggestionStatus) => {
        set({ statusFilter: status });
        // Automatically fetch suggestions with new filter
        get().fetchSuggestions(status);
      },

      // Get only pending suggestions
      getPendingSuggestions: () => {
        return get().suggestions.filter((s) => s.status === "pending");
      },

      // Get suggestion by ID
      getSuggestionById: (id: string) => {
        return get().suggestions.find((s) => s.id === id);
      },

      // Clear all suggestions (useful for refresh)
      clearSuggestions: () => {
        set({ suggestions: [] });
      },
    }),
    {
      name: "adhd-suggestion-storage",
      partialize: (state) => ({
        // Only persist pending suggestions, max 10 to avoid stale data
        suggestions: state.suggestions
          .filter((s) => s.status === "pending")
          .slice(0, 10),
        statusFilter: state.statusFilter,
      }),
    }
  )
);
