import { db, taskChanges } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
/**
 * TaskChangeTracker
 *
 * Service to track changes to tasks for efficient synchronization.
 * Phase 2 implementation with database persistence.
 */
import type { Task } from "@/db/types";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "TaskChangeTracker";

/**
 * Types of changes that can be tracked
 */
export type ChangeType = "CREATE" | "UPDATE" | "DELETE";

/**
 * Structure of a tracked change
 */
export interface TaskChange {
  id: string;
  taskId: string;
  providerId?: string | null;
  mappingId?: string | null;
  changeType: ChangeType;
  timestamp: Date;
  changeData?: Record<string, unknown> | null; // The fields that changed
  synced: boolean;
  userId: string;
}

/**
 * Class for tracking changes to tasks
 * Full implementation for bidirectional sync
 */
export class TaskChangeTracker {
  /**
   * Track a change to a task
   *
   * @param taskId The ID of the task that changed
   * @param changeType The type of change
   * @param userId The ID of the user making the change
   * @param data Additional data about the change
   * @param providerId Optional provider ID if this change is related to a sync
   * @param mappingId Optional mapping ID if this change is related to a list sync
   */
  async trackChange(
    taskId: string,
    changeType: ChangeType,
    userId: string,
    data?: Record<string, unknown>,
    providerId?: string,
    mappingId?: string
  ): Promise<void> {
    try {
      // Special handling for DELETE operations
      if (changeType === "DELETE") {
        // For DELETE operations, we need to ensure we have all the data we need
        // since the task will be deleted and we won't be able to look it up later
        if (
          !data ||
          !data.externalTaskId ||
          !data.source ||
          !data.externalListId
        ) {
          logger.error(
            `Cannot track DELETE change: missing required external data`,
            {
              taskId,
              data: data ? JSON.stringify(data) : "null",
            },
            LOG_SOURCE
          );
          return;
        }
      }

      logger.debug(
        `Tracking task change: ${changeType} for task ${taskId}`,
        {
          taskId,
          changeType,
          providerId: providerId || null,
          mappingId: mappingId || null,
        },
        LOG_SOURCE
      );

      // Create a record in the database
      await db.insert(taskChanges).values({
        id: crypto.randomUUID(),
        taskId,
        changeType,
        // For Prisma JSON fields, we need to handle it as JSON
        changeData: data ? JSON.parse(JSON.stringify(data)) : undefined,
        providerId,
        mappingId,
        userId,
        timestamp: newDate(),
        synced: false,
      }).returning();
    } catch (error) {
      logger.error(
        `Failed to track task change`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          taskId,
          changeType,
        },
        LOG_SOURCE
      );
      // We don't throw here to avoid breaking the main task operation
      // Just log the error and continue
    }
  }

  /**
   * Get changes to tasks since a specific time
   *
   * @param mappingId The ID of the task list mapping
   * @param since The timestamp to get changes since
   * @param onlySynced Whether to only get changes that have been synced
   */
  async getChangesSince(
    mappingId: string,
    since: Date,
    onlySynced: boolean = false
  ): Promise<TaskChange[]> {
    try {
      logger.debug(
        `Getting changes since ${since.toISOString()} for mapping ${mappingId}`,
        {
          mappingId,
          sinceDate: since.toISOString(),
          onlySynced,
        },
        LOG_SOURCE
      );

      // Query the database for changes
      const changes = await db.query.taskChanges.findMany({
        where: (taskChanges, { eq, and, gte }) => {
          const conditions = [
            eq(taskChanges.mappingId, mappingId),
            gte(taskChanges.timestamp, since)
          ];
          if (onlySynced) {
            conditions.push(eq(taskChanges.synced, true));
          }
          return and(...conditions);
        },
        orderBy: (changes, { asc }) => [asc(changes.timestamp)],
      });

      return changes as TaskChange[];
    } catch (error) {
      logger.error(
        `Failed to get task changes`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          mappingId,
          sinceDate: since.toISOString(),
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Get all unsynchronized changes for a specific mapping
   *
   * @param mappingId The ID of the task list mapping
   */
  async getUnsyncedChanges(mappingId: string): Promise<TaskChange[]> {
    try {
      logger.debug(
        `Getting unsynced changes for mapping ${mappingId}`,
        {
          mappingId,
        },
        LOG_SOURCE
      );

      // Query the database for unsynced changes
      const changes = await db.query.taskChanges.findMany({
        where: (taskChanges, { eq, and }) => and(
          eq(taskChanges.mappingId, mappingId),
          eq(taskChanges.synced, false)
        ),
        orderBy: (changes, { asc }) => [asc(changes.timestamp)],
      });

      return changes as TaskChange[];
    } catch (error) {
      logger.error(
        `Failed to get unsynced task changes`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          mappingId,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Mark changes as synced
   *
   * @param changeIds The IDs of the changes to mark as synced
   */
  async markAsSynced(changeIds: string[]): Promise<void> {
    if (!changeIds.length) return;

    try {
      logger.debug(
        `Marking changes as synced: ${changeIds.join(", ")}`,
        {
          changeIds,
        },
        LOG_SOURCE
      );

      // Update the database records
      await db.update(taskChanges)
        .set({ synced: true })
        .where(inArray(taskChanges.id, changeIds));
    } catch (error) {
      logger.error(
        `Failed to mark changes as synced`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          changeIds,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Compare two task objects and generate a change record
   * This is useful for detecting changes between local and remote tasks
   *
   * @param oldTask The original task state
   * @param newTask The new task state
   * @returns An object containing the changed fields
   */
  compareTaskObjects(
    oldTask: Partial<Task>,
    newTask: Partial<Task>
  ): Record<string, unknown> {
    const changes: Record<string, unknown> = {};

    // Compare fields and collect changes
    for (const key in newTask) {
      // Skip special fields
      if (["id", "createdAt", "updatedAt", "changes"].includes(key)) {
        continue;
      }

      // Check if field exists in old task
      if (!(key in oldTask)) {
        changes[key] = {
          oldValue: undefined,
          newValue: newTask[key as keyof Task],
        };
        continue;
      }

      // Check if field has changed
      if (
        JSON.stringify(oldTask[key as keyof Task]) !==
        JSON.stringify(newTask[key as keyof Task])
      ) {
        changes[key] = {
          oldValue: oldTask[key as keyof Task],
          newValue: newTask[key as keyof Task],
        };
      }
    }

    // Check for fields removed in the new task
    for (const key in oldTask) {
      if (
        !(key in newTask) &&
        !["id", "createdAt", "updatedAt", "changes"].includes(key)
      ) {
        changes[key] = {
          oldValue: oldTask[key as keyof Task],
          newValue: undefined,
        };
      }
    }

    return changes;
  }

  /**
   * Generate a hash of a task's key fields for change detection
   *
   * @param task The task to generate a hash for
   * @returns A string hash representing the task's key fields
   */
  generateTaskHash(task: Partial<Task>): string {
    const fieldsToHash = {
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate?.toISOString(),
      priority: task.priority,
      isRecurring: task.isRecurring,
      recurrenceRule: task.recurrenceRule,
    };

    return JSON.stringify(fieldsToHash);
  }
}
