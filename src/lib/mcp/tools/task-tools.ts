import { db, tasks } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "TaskTools";

// Zod Schemas for validation
export const GetTasksSchema = z.object({
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  priority: z.enum(["high", "medium", "low", "none"]).optional(),
  projectId: z.string().optional(),
  dueDate: z.string().optional().describe("Filter by due date (YYYY-MM-DD)"),
  dueBefore: z.string().optional().describe("Tasks due before date (YYYY-MM-DD)"),
  limit: z.number().optional().default(20).describe("Maximum number of tasks to return"),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1).describe("Task title"),
  description: z.string().optional(),
  projectId: z.string().optional(),
  dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
  priority: z.enum(["high", "medium", "low", "none"]).optional(),
  energyLevel: z.enum(["high", "medium", "low"]).optional(),
  duration: z.number().optional().describe("Estimated duration in minutes"),
});

export const UpdateTaskSchema = z.object({
  taskId: z.string().describe("ID of the task to update"),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["high", "medium", "low", "none"]).optional(),
});

export const CompleteTaskSchema = z.object({
  taskId: z.string().describe("ID of the task to complete"),
});

export const DeleteTaskSchema = z.object({
  taskId: z.string().describe("ID of the task to delete"),
});

/**
 * Get tasks with optional filters
 */
export async function getTasks(
  userId: string,
  params: z.infer<typeof GetTasksSchema>
) {
  try {
    const whereClause: {
      userId: string;
      status?: string;
      priority?: string;
      projectId?: string;
      dueDate?: { equals?: Date; lte?: Date };
    } = {
      userId,
    };

    if (params.status) {
      whereClause.status = params.status;
    }

    if (params.priority) {
      whereClause.priority = params.priority;
    }

    if (params.projectId) {
      whereClause.projectId = params.projectId;
    }

    if (params.dueDate) {
      const date = new Date(params.dueDate);
      date.setHours(23, 59, 59, 999);
      whereClause.dueDate = { equals: date };
    } else if (params.dueBefore) {
      const date = new Date(params.dueBefore);
      date.setHours(23, 59, 59, 999);
      whereClause.dueDate = { lte: date };
    }

    const tasks = await db.query.tasks.findMany({
      where: whereClause,
      with: {
        project: {
          columns: {
            id: true,
            name: true,
            color: true,
          },
        },
        tags: {
          columns: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
      take: params.limit || 20,
    });

    logger.info(
      "Retrieved tasks",
      {
        userId,
        count: tasks.length,
        status: params.status || null,
        priority: params.priority || null,
      },
      LOG_SOURCE
    );

    return {
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString().split("T")[0] : null,
        duration: task.duration,
        energyLevel: task.energyLevel,
        project: task.project
          ? {
              id: task.project.id,
              name: task.project.name,
              color: task.project.color,
            }
          : null,
        tags: task.tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        })),
        isAutoScheduled: task.isAutoScheduled,
        scheduledStart: task.scheduledStart?.toISOString() || null,
        scheduledEnd: task.scheduledEnd?.toISOString() || null,
      })),
      count: tasks.length,
    };
  } catch (error) {
    logger.error(
      "Failed to get tasks",
      { userId, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return {
      error: "Failed to retrieve tasks",
      message: error instanceof Error ? error.message : "Unknown error",
      tasks: [],
      count: 0,
    };
  }
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  params: z.infer<typeof CreateTaskSchema>
) {
  try {
    const taskId = crypto.randomUUID();
    const [insertedTask] = await db.insert(tasks).values({
      id: taskId,
      userId,
      title: params.title,
      description: params.description,
      projectId: params.projectId,
      dueDate: params.dueDate ? new Date(params.dueDate) : null,
      priority: params.priority || "none",
      energyLevel: params.energyLevel,
      duration: params.duration,
      status: "todo",
    }).returning();

    // Fetch the task with project relation
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        project: {
          columns: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error("Failed to create task");
    }

    logger.info(
      "Created task",
      { userId, taskId: task.id, title: task.title },
      LOG_SOURCE
    );

    return {
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString().split("T")[0] : null,
        project: task.project
          ? {
              id: task.project.id,
              name: task.project.name,
              color: task.project.color,
            }
          : null,
      },
    };
  } catch (error) {
    logger.error(
      "Failed to create task",
      { userId, title: params.title, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return {
      error: "Failed to create task",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update an existing task
 */
export async function updateTask(
  userId: string,
  params: z.infer<typeof UpdateTaskSchema>
) {
  try {
    // Verify task belongs to user
    const existingTask = await db.query.tasks.findFirst({
      where: {
        id: params.taskId,
        userId,
      },
    });

    if (!existingTask) {
      return {
        error: "Task not found or access denied",
      };
    }

    const updateData: {
      title?: string;
      description?: string;
      status?: string;
      dueDate?: Date | null;
      priority?: string;
      completedAt?: Date | null;
    } = {};

    if (params.title) updateData.title = params.title;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.status) {
      updateData.status = params.status;
      if (params.status === "completed") {
        updateData.completedAt = new Date();
      }
    }
    if (params.dueDate !== undefined) {
      updateData.dueDate = params.dueDate ? new Date(params.dueDate) : null;
    }
    if (params.priority) updateData.priority = params.priority;

    const task = await prisma.task.update({
      where: { id: params.taskId },
      data: updateData,
      with: {
        project: {
          columns: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    logger.info(
      "Updated task",
      { userId, taskId: task.id, updates: Object.keys(updateData) },
      LOG_SOURCE
    );

    return {
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString().split("T")[0] : null,
        project: task.project
          ? {
              id: task.project.id,
              name: task.project.name,
              color: task.project.color,
            }
          : null,
      },
    };
  } catch (error) {
    logger.error(
      "Failed to update task",
      { userId, taskId: params.taskId, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return {
      error: "Failed to update task",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Complete a task (shortcut for updating status to completed)
 */
export async function completeTask(
  userId: string,
  params: z.infer<typeof CompleteTaskSchema>
) {
  return updateTask(userId, {
    taskId: params.taskId,
    status: "completed",
  });
}

/**
 * Delete a task
 */
export async function deleteTask(
  userId: string,
  params: z.infer<typeof DeleteTaskSchema>
) {
  try {
    // Verify task belongs to user
    const existingTask = await db.query.tasks.findFirst({
      where: {
        id: params.taskId,
        userId,
      },
    });

    if (!existingTask) {
      return {
        error: "Task not found or access denied",
      };
    }

    await prisma.task.delete({
      where: { id: params.taskId },
    });

    logger.info(
      "Deleted task",
      { userId, taskId: params.taskId },
      LOG_SOURCE
    );

    return {
      success: true,
      message: "Task deleted successfully",
    };
  } catch (error) {
    logger.error(
      "Failed to delete task",
      { userId, taskId: params.taskId, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return {
      error: "Failed to delete task",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
