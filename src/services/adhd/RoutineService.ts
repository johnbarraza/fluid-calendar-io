import { db, routines, routineTasks } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";

import { logger } from "@/lib/logger";
import type { Routine, RoutineTask, RoutineWithTasks } from "@/db/types";

const LOG_SOURCE = "RoutineService";

export interface RoutineTaskInput {
  name: string;
  icon?: string;
  duration: number; // Minutes
  order: number;
  autoContinue?: boolean;
  notes?: string;
}

export interface RoutineInput {
  name: string;
  description?: string;
  icon?: string;
  category?: string; // "mañana", "noche", "ejercicio", "estudio", "relajación"
  startTime: string; // HH:MM format
  isActive?: boolean;
  order?: number;
  tasks: RoutineTaskInput[];
}

// Use the type from @/db/types instead
export type { RoutineWithTasks } from "@/db/types";

export class RoutineService {
  /**
   * Get all routines for a user
   */
  async getUserRoutines(userId: string): Promise<RoutineWithTasks[]> {
    try {
      const routines = await db.query.routines.findMany({
        where: (routines, { eq }) => eq(routines.userId, userId),
        with: {
          tasks: {
            orderBy: (tasks, { asc }) => [asc(tasks.order)],
          },
        },
        orderBy: (routines, { asc }) => [asc(routines.order), asc(routines.startTime)],
      }) as unknown as RoutineWithTasks[];

      logger.info(
        `Fetched ${routines.length} routines for user`,
        { userId },
        LOG_SOURCE
      );

      return routines;
    } catch (error) {
      logger.error(
        "Failed to fetch user routines",
        { userId, error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Get a single routine by ID
   */
  async getRoutineById(
    routineId: string,
    userId: string
  ): Promise<RoutineWithTasks | null> {
    try {
      const routine = await db.query.routines.findFirst({
        where: (routines, { eq, and }) => and(eq(routines.id, routineId), eq(routines.userId, userId)),
        with: {
          tasks: {
            orderBy: (tasks, { asc }) => [asc(tasks.order)],
          },
        },
      }) as unknown as RoutineWithTasks;

      return routine || null;
    } catch (error) {
      logger.error(
        "Failed to fetch routine",
        {
          routineId,
          userId,
          error: error instanceof Error ? error.message : "Unknown",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Get routines by category
   */
  async getRoutinesByCategory(
    userId: string,
    category: string
  ): Promise<RoutineWithTasks[]> {
    try {
      const routines = await db.query.routines.findMany({
        where: (routines, { eq, and }) => and(eq(routines.userId, userId), eq(routines.category, category)),
        with: {
          tasks: {
            orderBy: (tasks, { asc }) => [asc(tasks.order)],
          },
        },
        orderBy: (routines, { asc }) => [asc(routines.order), asc(routines.startTime)],
      }) as unknown as RoutineWithTasks[];

      return routines;
    } catch (error) {
      logger.error(
        "Failed to fetch routines by category",
        {
          userId,
          category,
          error: error instanceof Error ? error.message : "Unknown",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Create a new routine with tasks
   */
  async createRoutine(
    userId: string,
    data: RoutineInput
  ): Promise<RoutineWithTasks> {
    try {
      const routineId = crypto.randomUUID();

      // Create the routine first
      const [routine] = await db.insert(routines).values({
        id: routineId,
        userId,
        name: data.name,
        description: data.description,
        icon: data.icon,
        category: data.category,
        startTime: data.startTime,
        isActive: data.isActive ?? true,
        order: data.order ?? 0,
      }).returning();

      // Create the routine tasks
      if (data.tasks && data.tasks.length > 0) {
        await db.insert(routineTasks).values(
          data.tasks.map((task) => ({
            id: crypto.randomUUID(),
            routineId: routineId,
            name: task.name,
            icon: task.icon,
            duration: task.duration,
            order: task.order,
            autoContinue: task.autoContinue ?? true,
            notes: task.notes,
          }))
        );
      }

      // Fetch the complete routine with tasks
      const routineWithTasks = await db.query.routines.findFirst({
        where: eq(routines.id, routineId),
        with: {
          tasks: {
            orderBy: (tasks, { asc }) => [asc(tasks.order)],
          },
        },
      }) as unknown as RoutineWithTasks;

      if (!routineWithTasks) {
        throw new Error("Failed to create routine");
      }

      logger.info(
        "Created routine with tasks",
        { routineId: routine.id, taskCount: routineWithTasks.tasks.length },
        LOG_SOURCE
      );

      return routineWithTasks;
    } catch (error) {
      logger.error(
        "Failed to create routine",
        { userId, error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Update a routine
   */
  async updateRoutine(
    routineId: string,
    userId: string,
    data: Partial<RoutineInput>
  ): Promise<RoutineWithTasks> {
    try {
      // Verify ownership
      const existing = await db.query.routines.findFirst({
        where: (routines, { eq, and }) => and(eq(routines.id, routineId), eq(routines.userId, userId)),
      });

      if (!existing) {
        throw new Error("Routine not found or access denied");
      }

      // Update routine
      await db.update(routines)
        .set({
          name: data.name,
          description: data.description,
          icon: data.icon,
          category: data.category,
          startTime: data.startTime,
          isActive: data.isActive,
          order: data.order,
        })
        .where(eq(routines.id, routineId));

      // Update tasks if provided
      if (data.tasks) {
        // Delete existing tasks
        await db.delete(routineTasks)
          .where(eq(routineTasks.routineId, routineId));

        // Create new tasks
        await db.insert(routineTasks).values(
          data.tasks.map((task) => ({
            id: crypto.randomUUID(),
            routineId: routineId,
            name: task.name,
            icon: task.icon,
            duration: task.duration,
            order: task.order,
            autoContinue: task.autoContinue ?? true,
            notes: task.notes,
          }))
        );
      }

      // Fetch updated routine with tasks
      const routine = await db.query.routines.findFirst({
        where: (table, { eq }) => eq(table.id, routineId),
        with: {
          tasks: {
            orderBy: (tasks, { asc }) => [asc(tasks.order)],
          },
        },
      }) as unknown as RoutineWithTasks;

      logger.info("Updated routine", { routineId }, LOG_SOURCE);

      return routine;
    } catch (error) {
      logger.error(
        "Failed to update routine",
        {
          routineId,
          userId,
          error: error instanceof Error ? error.message : "Unknown",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Delete a routine
   */
  async deleteRoutine(routineId: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      const existing = await db.query.routines.findFirst({
        where: (routines, { eq, and }) => and(eq(routines.id, routineId), eq(routines.userId, userId)),
      });

      if (!existing) {
        throw new Error("Routine not found or access denied");
      }

      await db.delete(routines)
        .where(eq(routines.id, routineId));

      logger.info("Deleted routine", { routineId }, LOG_SOURCE);
    } catch (error) {
      logger.error(
        "Failed to delete routine",
        {
          routineId,
          userId,
          error: error instanceof Error ? error.message : "Unknown",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Toggle routine active status
   */
  async toggleRoutineActive(
    routineId: string,
    userId: string
  ): Promise<RoutineWithTasks> {
    try {
      const existing = await db.query.routines.findFirst({
        where: (routines, { eq, and }) => and(eq(routines.id, routineId), eq(routines.userId, userId)),
      });

      if (!existing) {
        throw new Error("Routine not found or access denied");
      }

      await db.update(routines)
        .set({ isActive: !existing.isActive })
        .where(eq(routines.id, routineId));

      const routine = await db.query.routines.findFirst({
        where: (table, { eq }) => eq(table.id, routineId),
        with: {
          tasks: {
            orderBy: (tasks, { asc }) => [asc(tasks.order)],
          },
        },
      }) as unknown as RoutineWithTasks;

      logger.info(
        "Toggled routine active status",
        { routineId, isActive: routine.isActive },
        LOG_SOURCE
      );

      return routine;
    } catch (error) {
      logger.error(
        "Failed to toggle routine active status",
        {
          routineId,
          userId,
          error: error instanceof Error ? error.message : "Unknown",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Calculate total duration of a routine
   */
  calculateRoutineDuration(tasks: RoutineTask[]): number {
    return tasks.reduce((total, task) => total + task.duration, 0);
  }

  /**
   * Get routine end time based on start time and total duration
   */
  getRoutineEndTime(startTime: string, tasks: RoutineTask[]): string {
    const totalMinutes = this.calculateRoutineDuration(tasks);
    const [hours, minutes] = startTime.split(":").map(Number);

    const totalMins = hours * 60 + minutes + totalMinutes;
    const endHours = Math.floor(totalMins / 60) % 24;
    const endMinutes = totalMins % 60;

    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  }
}
