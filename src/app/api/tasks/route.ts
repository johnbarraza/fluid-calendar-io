import { NextRequest, NextResponse } from "next/server";

import { RRule } from "rrule";
import { eq, and, or, inArray, like, gte, lte, isNull, SQL } from "drizzle-orm";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { db, tasks, tags, projects, taskTags, taskListMappings } from "@/db";
import {
  ChangeType,
  TaskChangeTracker,
} from "@/lib/task-sync/task-change-tracker";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";

import { EnergyLevel, TaskStatus, TimePreference } from "@/types/task";

const LOG_SOURCE = "tasks-route";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.getAll("status") as TaskStatus[];
    const tagIds = searchParams.getAll("tagIds");
    const energyLevel = searchParams.getAll("energyLevel") as EnergyLevel[];
    const timePreference = searchParams.getAll(
      "timePreference"
    ) as TimePreference[];
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const taskStartDate = searchParams.get("taskStartDate");
    const hideUpcomingTasks = searchParams.get("hideUpcomingTasks") === "true";

    const now = newDate();

    // Build where conditions
    const conditions: SQL[] = [eq(tasks.userId, userId)];

    if (status.length > 0) {
      conditions.push(inArray(tasks.status, status));
    }
    if (energyLevel.length > 0) {
      conditions.push(inArray(tasks.energyLevel, energyLevel));
    }
    if (timePreference.length > 0) {
      conditions.push(inArray(tasks.preferredTime, timePreference));
    }
    if (search) {
      conditions.push(
        or(
          like(tasks.title, `%${search}%`),
          like(tasks.description, `%${search}%`)
        )!
      );
    }
    if (startDate && endDate) {
      conditions.push(
        and(
          gte(tasks.dueDate, newDate(startDate)),
          lte(tasks.dueDate, newDate(endDate))
        )!
      );
    }
    if (taskStartDate) {
      conditions.push(gte(tasks.startDate, newDate(taskStartDate)));
    }
    if (hideUpcomingTasks) {
      conditions.push(
        or(
          isNull(tasks.startDate),
          lte(tasks.startDate, now)
        )!
      );
    }

    // Query tasks with relations
    let tasksResult = await db.query.tasks.findMany({
      where: and(...conditions),
      with: {
        tags: true,
        project: true,
      },
      orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
    });

    // If filtering by tagIds, we need to filter manually since Drizzle doesn't support nested some
    if (tagIds.length > 0) {
      tasksResult = tasksResult.filter((task) =>
        task.tags.some((tag) => tagIds.includes(tag.id))
      );
    }

    return NextResponse.json(tasksResult);
  } catch (error) {
    logger.error(
      "Error fetching tasks:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const json = await request.json();
    const { tagIds, recurrenceRule, ...taskData } = json;

    // Normalize and validate recurrence rule if provided
    const standardizedRecurrenceRule = recurrenceRule
      ? normalizeRecurrenceRule(recurrenceRule)
      : undefined;

    if (standardizedRecurrenceRule) {
      try {
        // Attempt to parse the standardized RRule string to validate it
        RRule.fromString(standardizedRecurrenceRule);
      } catch (error) {
        logger.error(
          "Error parsing recurrence rule:",
          {
            error: error instanceof Error ? error.message : String(error),
          },
          LOG_SOURCE
        );
        return new NextResponse("Invalid recurrence rule", { status: 400 });
      }
    }

    // Find the project's task mapping if it exists
    let mappingId = null;
    if (taskData.projectId) {
      const mapping = await db.query.taskListMappings.findFirst({
        where: eq(taskListMappings.projectId, taskData.projectId),
      });
      if (mapping) {
        mappingId = mapping.id;
      }
    }

    // Create the task
    const [newTask] = await db.insert(tasks).values({
      ...taskData,
      userId,
      isRecurring: !!recurrenceRule,
      recurrenceRule: standardizedRecurrenceRule,
    }).returning();

    // Connect tags if provided (many-to-many relationship)
    if (tagIds && tagIds.length > 0) {
      await db.insert(taskTags).values(
        tagIds.map((tagId: string) => ({
          taskId: newTask.id,
          tagId: tagId,
        }))
      );
    }

    // Fetch the complete task with relations
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, newTask.id),
      with: {
        tags: true,
        project: true,
      },
    });

    // Track the creation for sync purposes if the task is in a mapped project
    if (mappingId) {
      const changeTracker = new TaskChangeTracker();
      await changeTracker.trackChange(
        task.id,
        "CREATE" as ChangeType,
        userId,
        { task },
        undefined, // providerId will be determined later during sync
        mappingId
      );

      logger.info(
        `Tracked CREATE change for task ${task.id} in mapping ${mappingId}`,
        {
          taskId: task.id,
          mappingId,
        },
        LOG_SOURCE
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    logger.error(
      "Error creating task:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
