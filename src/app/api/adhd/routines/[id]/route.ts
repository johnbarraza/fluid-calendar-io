import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { RoutineService } from "@/services/adhd/RoutineService";

const LOG_SOURCE = "RoutineAPI";

// GET /api/adhd/routines/[id] - Get a specific routine
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const routineService = new RoutineService();
    const routine = await routineService.getRoutineById(params.id, auth.userId);

    if (!routine) {
      return NextResponse.json(
        { error: "Routine not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(routine);
  } catch (error) {
    logger.error(
      "Failed to fetch routine",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch routine" },
      { status: 500 }
    );
  }
}

// PATCH /api/adhd/routines/[id] - Update a routine
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();
    const routineService = new RoutineService();

    const routine = await routineService.updateRoutine(
      params.id,
      auth.userId,
      body
    );

    logger.info("Routine updated", { routineId: routine.id }, LOG_SOURCE);

    return NextResponse.json(routine);
  } catch (error) {
    logger.error(
      "Failed to update routine",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update routine" },
      { status: 500 }
    );
  }
}

// DELETE /api/adhd/routines/[id] - Delete a routine
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const routineService = new RoutineService();
    await routineService.deleteRoutine(params.id, auth.userId);

    logger.info("Routine deleted", { routineId: params.id }, LOG_SOURCE);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to delete routine",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete routine" },
      { status: 500 }
    );
  }
}
