import { NextRequest, NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { db, projects, tasks } from "@/db";

const LOG_SOURCE = "project-route";

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
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, userId)),
      with: {
        tasks: true,
      },
    });

    if (!project) {
      return new NextResponse("Project not found", { status: 404 });
    }

    // Add _count field for backward compatibility
    const projectWithCount = {
      ...project,
      _count: {
        tasks: project.tasks.length,
      },
    };

    return NextResponse.json(projectWithCount);
  } catch (error) {
    logger.error(
      "Error fetching project:",
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
    const json = await request.json();

    // Update the project
    await db
      .update(projects)
      .set({
        name: json.name,
        description: json.description,
        color: json.color,
        status: json.status,
      })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));

    // Fetch the updated project with tasks to compute count
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, userId)),
      with: {
        tasks: true,
      },
    });

    if (!project) {
      return new NextResponse("Project not found", { status: 404 });
    }

    // Add _count field for backward compatibility
    const projectWithCount = {
      ...project,
      _count: {
        tasks: project.tasks.length,
      },
      tasks: undefined,
    };

    return NextResponse.json(projectWithCount);
  } catch (error) {
    logger.error(
      "Error updating project:",
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

    // Check if project exists and get task count
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, userId)),
      with: {
        tasks: true,
      },
    });

    if (!project) {
      return new NextResponse("Project not found", { status: 404 });
    }

    const taskCount = project.tasks.length;

    // Use transaction to ensure atomic deletion
    await db.transaction(async (tx) => {
      // Delete all tasks associated with the project
      await tx.delete(tasks).where(
        and(eq(tasks.projectId, id), eq(tasks.userId, userId))
      );

      // Delete the project (this will cascade delete TaskListMappings due to onDelete: CASCADE)
      await tx.delete(projects).where(
        and(eq(projects.id, id), eq(projects.userId, userId))
      );
    });

    return NextResponse.json({
      success: true,
      deletedTasks: taskCount,
    });
  } catch (error) {
    logger.error(
      "Error deleting project:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
