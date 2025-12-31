import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { RoutineService } from "@/services/adhd/RoutineService";

const LOG_SOURCE = "RoutinesAPI";

// GET /api/adhd/routines - Get all routines for user
// GET /api/adhd/routines?category=mañana - Get routines by category
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const routineService = new RoutineService();

    if (category) {
      const routines = await routineService.getRoutinesByCategory(
        auth.userId,
        category
      );
      return NextResponse.json(routines);
    }

    const routines = await routineService.getUserRoutines(auth.userId);
    return NextResponse.json(routines);
  } catch (error) {
    logger.error(
      "Failed to fetch routines",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch routines" },
      { status: 500 }
    );
  }
}

// POST /api/adhd/routines - Create a new routine
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();
    const { name, description, icon, category, startTime, isActive, order, tasks } = body;

    if (!name || !startTime || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: "Name, start time, and at least one task are required" },
        { status: 400 }
      );
    }

    const routineService = new RoutineService();
    const routine = await routineService.createRoutine(auth.userId, {
      name,
      description,
      icon,
      category,
      startTime,
      isActive,
      order,
      tasks,
    });

    logger.info("Routine created", { routineId: routine.id }, LOG_SOURCE);

    return NextResponse.json(routine, { status: 201 });
  } catch (error) {
    logger.error(
      "Failed to create routine",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to create routine" },
      { status: 500 }
    );
  }
}
