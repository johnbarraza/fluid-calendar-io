import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Routine, RoutineTask } from "@prisma/client";

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

export interface RoutineWithTasks extends Routine {
  tasks: RoutineTask[];
}

export class RoutineService {
  /**
   * Get all routines for a user
   */
  async getUserRoutines(userId: string): Promise<RoutineWithTasks[]> {
    try {
      const routines = await prisma.routine.findMany({
        where: { userId },
        include: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ order: "asc" }, { startTime: "asc" }],
      });

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
      const routine = await prisma.routine.findFirst({
        where: { id: routineId, userId },
        include: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
      });

      return routine;
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
      const routines = await prisma.routine.findMany({
        where: { userId, category },
        include: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ order: "asc" }, { startTime: "asc" }],
      });

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
      const routine = await prisma.routine.create({
        data: {
          userId,
          name: data.name,
          description: data.description,
          icon: data.icon,
          category: data.category,
          startTime: data.startTime,
          isActive: data.isActive ?? true,
          order: data.order ?? 0,
          tasks: {
            create: data.tasks.map((task) => ({
              name: task.name,
              icon: task.icon,
              duration: task.duration,
              order: task.order,
              autoContinue: task.autoContinue ?? true,
              notes: task.notes,
            })),
          },
        },
        include: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
      });

      logger.info(
        "Created routine with tasks",
        { routineId: routine.id, taskCount: routine.tasks.length },
        LOG_SOURCE
      );

      return routine;
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
      const existing = await prisma.routine.findFirst({
        where: { id: routineId, userId },
      });

      if (!existing) {
        throw new Error("Routine not found or access denied");
      }

      // Update routine and tasks
      const routine = await prisma.routine.update({
        where: { id: routineId },
        data: {
          name: data.name,
          description: data.description,
          icon: data.icon,
          category: data.category,
          startTime: data.startTime,
          isActive: data.isActive,
          order: data.order,
          ...(data.tasks && {
            tasks: {
              deleteMany: {}, // Delete existing tasks
              create: data.tasks.map((task) => ({
                name: task.name,
                icon: task.icon,
                duration: task.duration,
                order: task.order,
                autoContinue: task.autoContinue ?? true,
                notes: task.notes,
              })),
            },
          }),
        },
        include: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
      });

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
      const existing = await prisma.routine.findFirst({
        where: { id: routineId, userId },
      });

      if (!existing) {
        throw new Error("Routine not found or access denied");
      }

      await prisma.routine.delete({
        where: { id: routineId },
      });

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
      const existing = await prisma.routine.findFirst({
        where: { id: routineId, userId },
      });

      if (!existing) {
        throw new Error("Routine not found or access denied");
      }

      const routine = await prisma.routine.update({
        where: { id: routineId },
        data: { isActive: !existing.isActive },
        include: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
      });

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
