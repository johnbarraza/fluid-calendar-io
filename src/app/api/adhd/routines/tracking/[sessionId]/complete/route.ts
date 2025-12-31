import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { RoutineTrackingService } from "@/services/adhd/RoutineTrackingService";

const LOG_SOURCE = "SessionCompleteAPI";

// POST /api/adhd/routines/tracking/[sessionId]/complete - Complete a routine session
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    const trackingService = new RoutineTrackingService();
    const session = await trackingService.completeRoutine(
      auth.userId,
      params.sessionId,
      { notes }
    );

    logger.info(
      "Session completed",
      { sessionId: params.sessionId },
      LOG_SOURCE
    );

    return NextResponse.json(session);
  } catch (error) {
    logger.error(
      "Failed to complete session",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to complete session" },
      { status: 500 }
    );
  }
}
