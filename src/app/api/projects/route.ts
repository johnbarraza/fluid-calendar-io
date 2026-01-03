import { NextRequest, NextResponse } from "next/server";

import { eq, and, or, inArray, like, SQL } from "drizzle-orm";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { db, projects } from "@/db";

import { ProjectStatus } from "@/types/project";

const LOG_SOURCE = "projects-route";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.getAll("status") as ProjectStatus[];
    const search = searchParams.get("search");

    // Build where conditions
    const conditions: SQL[] = [eq(projects.userId, userId)];

    if (status.length > 0) {
      conditions.push(inArray(projects.status, status));
    }
    if (search) {
      conditions.push(
        or(
          like(projects.name, `%${search}%`),
          like(projects.description, `%${search}%`)
        )!
      );
    }

    // Query projects with tasks included to compute count
    const projectsResult = await db.query.projects.findMany({
      where: and(...conditions),
      with: {
        tasks: true,
      },
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });

    // Map to include _count field for backward compatibility
    const projectsWithCount = projectsResult.map((project) => ({
      ...project,
      _count: {
        tasks: project.tasks.length,
      },
      // Remove tasks array to match original response
      tasks: undefined,
    }));

    return NextResponse.json(projectsWithCount);
  } catch (error) {
    logger.error(
      "Error fetching projects:",
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

    // Create the project
    const [newProject] = await db.insert(projects).values({
      name: json.name,
      description: json.description,
      color: json.color,
      status: json.status || ProjectStatus.ACTIVE,
      // Associate the project with the current user
      userId,
    }).returning();

    // Fetch the complete project with tasks to compute count
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, newProject.id),
      with: {
        tasks: true,
      },
    });

    // Add _count field for backward compatibility
    const projectWithCount = {
      ...project,
      _count: {
        tasks: project!.tasks.length,
      },
      tasks: undefined,
    };

    return NextResponse.json(projectWithCount);
  } catch (error) {
    logger.error(
      "Error creating project:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
