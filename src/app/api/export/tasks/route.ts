import { db, tasks, projects, tags } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "export-tasks-api";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the includeCompleted parameter from the query string
    const includeCompleted =
      request.nextUrl.searchParams.get("includeCompleted") === "true";

    // Fetch all tasks for the user
    const tasks = await db.query.tasks.findMany({
      where: (table, { eq, and, ne }) => {
        if (includeCompleted) {
          return eq(table.userId, userId);
        }
        return and(
          eq(table.userId, userId),
          ne(table.status, "completed")
        );
      },
      with: {
        tags: true,
        project: true,
      },
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    // Fetch all projects for the user
    const projects = await db.query.projects.findMany({
      where: (table, { eq }) => eq(table.userId, userId),
      orderBy: (table, { asc }) => [asc(table.name)],
    });

    // Fetch all tags for the user
    const tags = await db.query.tags.findMany({
      where: (table, { eq }) => eq(table.userId, userId),
      orderBy: (table, { asc }) => [asc(table.name)],
    });

    // Create the export data structure
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: "1.0",
        includeCompleted,
      },
      tasks,
      projects,
      tags,
    };

    logger.info(
      "Tasks exported",
      {
        userId,
        taskCount: tasks.length,
        projectCount: projects.length,
        tagCount: tags.length,
        includeCompleted,
      },
      LOG_SOURCE
    );

    return NextResponse.json(exportData);
  } catch (error) {
    logger.error(
      "Error exporting tasks",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to export tasks" },
      { status: 500 }
    );
  }
}
