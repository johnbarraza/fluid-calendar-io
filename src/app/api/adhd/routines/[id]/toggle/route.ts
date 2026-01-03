import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { RoutineService } from "@/services/adhd/RoutineService";

const LOG_SOURCE = "RoutineToggleAPI";

// POST /api/adhd/routines/[id]/toggle - Toggle routine active status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const resolvedParams = await params;
    const routineService = new RoutineService();
    const routine = await routineService.toggleRoutineActive(
      resolvedParams.id,
      auth.userId
    );

    logger.info(
      "Routine active status toggled",
      { routineId: routine.id, isActive: routine.isActive },
      LOG_SOURCE
    );

    return NextResponse.json(routine);
  } catch (error) {
    logger.error(
      "Failed to toggle routine active status",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to toggle routine active status" },
      { status: 500 }
    );
  }
}
