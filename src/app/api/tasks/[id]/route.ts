import { NextRequest, NextResponse } from "next/server";

import { RRule } from "rrule";
import { eq, and } from "drizzle-orm";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { db, tasks, taskTags, taskListMappings } from "@/db";
import {
  ChangeType,
  TaskChangeTracker,
} from "@/lib/task-sync/task-change-tracker";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";

import { TaskStatus } from "@/types/task";

const LOG_SOURCE = "task-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
      with: {
        tags: true,
        project: true,
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    logger.error(
      "Error fetching task:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    logger.info(`Updating task ${id}`, { userId }, LOG_SOURCE);

    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
      with: {
        tags: true,
      },
    });

    if (!task) {
      logger.warn(`Task not found: ${id}`, { userId }, LOG_SOURCE);
      return new NextResponse("Task not found", { status: 404 });
    }

    const json = await request.json();
    logger.info(`Update payload for task ${id}`, { payload: json }, LOG_SOURCE);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tagIds, project, projectId, userId: _, ...updates } = json;

    // Set completedAt when task is marked as completed
    if (
      updates.status === TaskStatus.COMPLETED &&
      task.status !== TaskStatus.COMPLETED
    ) {
      updates.completedAt = newDate();
    }

    // Handle recurring task completion
    if (
      task.isRecurring &&
      updates.status === TaskStatus.COMPLETED &&
      task.recurrenceRule
    ) {
      try {
        // Normalize the recurrence rule to ensure compatibility with RRule
        const standardRecurrenceRule = normalizeRecurrenceRule(
          task.recurrenceRule
        );

        const rrule = RRule.fromString(standardRecurrenceRule!);

        // For tasks, we only care about the date part
        const baseDate = newDate(task.dueDate || newDate());
        // Set to start of day in UTC
        baseDate.setUTCHours(0, 0, 0, 0);

        // Add one day to the base date to ensure we get the next occurrence
        const searchDate = newDate(baseDate);
        searchDate.setDate(searchDate.getDate() + 1);

        // Get next occurrence and ensure it's just a date
        const nextOccurrence = rrule.after(searchDate);
        if (nextOccurrence) {
          nextOccurrence.setUTCHours(0, 0, 0, 0);
        }

        if (nextOccurrence) {
          // Calculate the time delta between start date and due date (if both exist)
          let nextStartDate = undefined;
          if (task.startDate && task.dueDate) {
            // Calculate the number of days between the original start and due dates
            const startToDueDelta = Math.round(
              (task.dueDate.getTime() - task.startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            // Apply the same delta to the new due date to get the new start date
            const newStartDate = new Date(nextOccurrence);
            newStartDate.setDate(newStartDate.getDate() - startToDueDelta);
            nextStartDate = newStartDate;

            logger.info(
              "Calculated new start date for recurring task",
              {
                taskId: task.id,
                originalStartDate: task.startDate?.toISOString(),
                originalDueDate: task.dueDate?.toISOString(),
                deltaInDays: startToDueDelta,
                newDueDate: nextOccurrence.toISOString(),
                newStartDate: nextStartDate.toISOString(),
              },
              LOG_SOURCE
            );
          }

          // Create a completed instance as a separate task
          const [completedInstance] = await db.insert(tasks).values({
            title: task.title,
            description: task.description,
            status: TaskStatus.COMPLETED,
            dueDate: baseDate, // Use the original due date for the completed instance
            startDate: task.startDate, // Use the original start date for the completed instance
            duration: task.duration,
            priority: task.priority,
            energyLevel: task.energyLevel,
            preferredTime: task.preferredTime,
            projectId: task.projectId,
            isRecurring: false,
            completedAt: newDate(), // Set completedAt for the completed instance
            userId,
          }).returning();

          // Connect tags to the completed instance
          if (task.tags.length > 0) {
            await db.insert(taskTags).values(
              task.tags.map((tag) => ({
                taskId: completedInstance.id,
                tagId: tag.id,
              }))
            );
          }

          // Update the recurring task with new due date and reset status
          updates.dueDate = nextOccurrence;
          updates.startDate = nextStartDate; // Update the start date if calculated
          updates.status = TaskStatus.TODO;
          updates.lastCompletedDate = newDate();
        }
      } catch (error) {
        logger.error(
          "Error handling task completion:",
          {
            error: error instanceof Error ? error.message : String(error),
          },
          LOG_SOURCE
        );
        return new NextResponse("Error handling task completion", {
          status: 500,
        });
      }
    }

    // Normalize recurrence rule if it exists in updates
    if (updates.recurrenceRule) {
      updates.recurrenceRule = normalizeRecurrenceRule(updates.recurrenceRule);
    }

    // Find the project's task mapping if it exists
    let mappingId = null;
    const targetProjectId = projectId || task.projectId;

    if (targetProjectId) {
      const mapping = await db.query.taskListMappings.findFirst({
        where: eq(taskListMappings.projectId, targetProjectId),
      });
      if (mapping) {
        mappingId = mapping.id;
      }
    }

    // Save the old task for change tracking
    const oldTask = { ...task };

    // Update the task
    await db.update(tasks)
      .set({
        ...updates,
        ...(projectId === null && { projectId: null }),
        ...(projectId && { projectId }),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

    // Update tags if provided
    if (tagIds) {
      // Remove all existing tags
      await db.delete(taskTags).where(eq(taskTags.taskId, id));
      // Add new tags
      if (tagIds.length > 0) {
        await db.insert(taskTags).values(
          tagIds.map((tagId: string) => ({
            taskId: id,
            tagId,
          }))
        );
      }
    }

    // Fetch the updated task with relations
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        tags: true,
        project: true,
      },
    });

    // Track the update for sync purposes if the task is in a mapped project
    if (mappingId && updatedTask) {
      const changeTracker = new TaskChangeTracker();
      const changes = changeTracker.compareTaskObjects(
        oldTask,
        updatedTask as any
      );

      await changeTracker.trackChange(
        task.id,
        "UPDATE" as ChangeType,
        userId,
        changes,
        undefined, // providerId will be set during sync
        mappingId
      );

      logger.info(
        `Tracked UPDATE change for task ${task.id} in mapping ${mappingId}`,
        {
          taskId: task.id,
          mappingId,
          changes: Object.keys(changes),
        },
        LOG_SOURCE
      );
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    logger.error(
      "Error updating task:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
      with: {
        project: true,
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Check if the task belongs to a mapped project
    let mappingId = null;
    if (task.projectId) {
      const mapping = await db.query.taskListMappings.findFirst({
        where: eq(taskListMappings.projectId, task.projectId),
      });
      if (mapping) {
        mappingId = mapping.id;
      }
    }

    // Track the deletion for sync purposes if the task was in a mapped project
    // and had an external ID BEFORE actually deleting the task
    if (mappingId && task.externalTaskId && task.source) {
      const changeTracker = new TaskChangeTracker();
      await changeTracker.trackChange(
        id,
        "DELETE" as ChangeType,
        userId,
        {
          externalTaskId: task.externalTaskId,
          source: task.source,
          externalListId: task.externalListId,
          projectId: task.projectId,
          title: task.title,
        },
        undefined, // providerId will be set during sync
        mappingId
      );

      logger.info(
        `Tracked DELETE change for task ${id} in mapping ${mappingId}`,
        {
          taskId: id,
          mappingId,
          externalTaskId: task.externalTaskId,
          title: task.title,
        },
        LOG_SOURCE
      );
    }

    // Now delete the task AFTER tracking the change
    // Tags will be deleted automatically via cascade
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error(
      "Error deleting task:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
