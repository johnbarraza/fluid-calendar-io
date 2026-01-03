import { db, tasks, autoScheduleSettings } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";


import { ProjectStatus } from "@/types/project";
import {
  EnergyLevel,
  Priority,
  TaskStatus,
  TaskWithRelations,
  TimePreference,
} from "@/types/task";

import { SchedulingService } from "./SchedulingService";

const LOG_SOURCE = "TaskSchedulingService";

// Define a type for the database result
type DbTaskWithRelations = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  duration: number | null;
  priority: string | null;
  energyLevel: string | null;
  preferredTime: string | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  recurrenceRule: string | null;
  lastCompletedDate: Date | null;
  completedAt: Date | null;
  isRecurring: boolean;
  isAutoScheduled: boolean;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  scheduleScore: number | null;
  lastScheduled: Date | null;
  scheduleLocked: boolean;
  postponedUntil: Date | null;
  userId: string;
  tags: {
    tag: {
      id: string;
      name: string;
      color: string | null;
      userId: string | null;
    }
  }[];
  project: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string | null;
  } | null;
};

/**
 * Convert database task to TaskWithRelations
 */
function convertDbTaskToTaskWithRelations(
  dbTask: DbTaskWithRelations
): TaskWithRelations {
  return {
    ...dbTask,
    status: dbTask.status as TaskStatus,
    priority: dbTask.priority as Priority | null,
    energyLevel: dbTask.energyLevel as EnergyLevel | null,
    preferredTime: dbTask.preferredTime as TimePreference | null,
    tags: dbTask.tags.map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color || undefined,
    })),
    project: dbTask.project
      ? {
        ...dbTask.project,
        status: dbTask.project.status as ProjectStatus,
      }
      : null,
  };
}

/**
 * Schedule all tasks for a user
 * @param userId The user ID
 * @returns The updated tasks
 */
export async function scheduleAllTasksForUser(
  userId: string
): Promise<TaskWithRelations[]>;

/**
 * Implementation of scheduleAllTasksForUser
 */
export async function scheduleAllTasksForUser(
  userId: string
): Promise<TaskWithRelations[]> {
  try {
    logger.info("Starting task scheduling for user", { userId }, LOG_SOURCE);

    // If settings are not provided, fetch them from the database
    const userSettings = await db.query.autoScheduleSettings.findFirst({
      where: (autoScheduleSettings, { eq }) => eq(autoScheduleSettings.userId, userId),
    });

    if (!userSettings) {
      throw new Error("Auto-schedule settings not found for user");
    }

    // Get all tasks marked for auto-scheduling that are not locked
    const tasksToSchedule = await db.query.tasks.findMany({
      where: (tasks, { eq, and, not, inArray }) => and(
        eq(tasks.isAutoScheduled, true),
        eq(tasks.scheduleLocked, false),
        not(inArray(tasks.status, [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS])),
        eq(tasks.userId, userId)
      ),
      with: {
        project: true,
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });

    // Get locked tasks (we'll keep their schedules)
    const lockedTasks = await db.query.tasks.findMany({
      where: (tasks, { eq, and, not, inArray }) => and(
        eq(tasks.isAutoScheduled, true),
        eq(tasks.scheduleLocked, true),
        not(inArray(tasks.status, [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS])),
        eq(tasks.userId, userId)
      ),
      with: {
        project: true,
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });

    logger.info(
      "Found tasks to schedule",
      {
        tasksToScheduleCount: tasksToSchedule.length,
        lockedTasksCount: lockedTasks.length,
      },
      LOG_SOURCE
    );

    // Initialize scheduling service with settings
    const schedulingService = new SchedulingService(userSettings);

    // Clear existing schedules for non-locked tasks
    await db.update(tasks)
      .set({
        scheduledStart: null,
        scheduledEnd: null,
        scheduleScore: null,
      })
      .where(and(
        inArray(tasks.id, tasksToSchedule.map((task) => task.id)),
        eq(tasks.userId, userId)
      ));

    // Schedule all tasks
    const updatedTasks = await schedulingService.scheduleMultipleTasks(
      [...tasksToSchedule, ...lockedTasks],
      userId
    );

    // Update the lastScheduled timestamp for all tasks
    await db.update(tasks)
      .set({ lastScheduled: new Date() })
      .where(inArray(tasks.id, updatedTasks.map((task) => task.id)));

    // Fetch the tasks again with their relations to return
    const dbTasks = (await db.query.tasks.findMany({
      where: (tasks, { eq, and, inArray }) => and(
        inArray(tasks.id, updatedTasks.map((task) => task.id)),
        eq(tasks.userId, userId)
      ),
      with: {
        tags: {
          with: {
            tag: true,
          },
        },
        project: true,
      },
    })) as DbTaskWithRelations[];

    // Convert database tasks to TaskWithRelations
    const tasksWithRelations = dbTasks.map(convertDbTaskToTaskWithRelations);

    logger.info(
      "Task scheduling completed successfully",
      { userId, tasksScheduled: updatedTasks.length },
      LOG_SOURCE
    );

    return tasksWithRelations;
  } catch (error) {
    logger.error(
      "Error scheduling tasks",
      {
        error: error instanceof Error ? error.message : String(error),
        userId,
      },
      LOG_SOURCE
    );
    throw error;
  }
}
