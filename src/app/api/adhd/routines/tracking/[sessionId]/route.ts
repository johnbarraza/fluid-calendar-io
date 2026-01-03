import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { RoutineTrackingService } from "@/services/adhd/RoutineTrackingService";

const LOG_SOURCE = "SessionTrackingAPI";

// PATCH /api/adhd/routines/tracking/[sessionId] - Update session progress
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { currentTaskIndex, currentTaskStatus, completedTasks } = body;

    const trackingService = new RoutineTrackingService();
    const session = await trackingService.updateRoutineProgress(
      auth.userId,
      resolvedParams.sessionId,
      {
        currentTaskIndex,
        currentTaskStatus,
        completedTasks,
      }
    );

    logger.info(
      "Session progress updated",
      { sessionId: resolvedParams.sessionId },
      LOG_SOURCE
    );

    return NextResponse.json(session);
  } catch (error) {
    logger.error(
      "Failed to update session progress",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update session progress" },
      { status: 500 }
    );
  }
}

// DELETE /api/adhd/routines/tracking/[sessionId] - Abandon session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const resolvedParams = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const trackingService = new RoutineTrackingService();
    const session = await trackingService.abandonRoutine(
      auth.userId,
      resolvedParams.sessionId,
      reason
    );

    logger.info("Session abandoned", { sessionId: resolvedParams.sessionId }, LOG_SOURCE);

    return NextResponse.json(session);
  } catch (error) {
    logger.error(
      "Failed to abandon session",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to abandon session" },
      { status: 500 }
    );
  }
}
