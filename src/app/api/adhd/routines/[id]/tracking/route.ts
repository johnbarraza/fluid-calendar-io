import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { RoutineTrackingService } from "@/services/adhd/RoutineTrackingService";

const LOG_SOURCE = "RoutineTrackingAPI";

// POST /api/adhd/routines/[id]/tracking - Start a new routine session
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
    const trackingService = new RoutineTrackingService();
    const session = await trackingService.startRoutine(auth.userId, {
      routineId: resolvedParams.id,
    });

    logger.info(
      "Routine session started",
      { sessionId: session.id, routineId: resolvedParams.id },
      LOG_SOURCE
    );

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    logger.error(
      "Failed to start routine session",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to start routine session" },
      { status: 500 }
    );
  }
}

// GET /api/adhd/routines/[id]/tracking - Get active session or recent completions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "active";

    const trackingService = new RoutineTrackingService();

    if (type === "active") {
      const session = await trackingService.getActiveSession(
        auth.userId,
        resolvedParams.id
      );
      return NextResponse.json(session);
    }

    if (type === "recent") {
      const limit = parseInt(searchParams.get("limit") || "10", 10);
      const completions = await trackingService.getRecentCompletions(
        auth.userId,
        resolvedParams.id,
        limit
      );
      return NextResponse.json(completions);
    }

    if (type === "stats") {
      const stats = await trackingService.getRoutineStats(
        auth.userId,
        resolvedParams.id
      );
      return NextResponse.json(stats);
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    logger.error(
      "Failed to get routine tracking data",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to get tracking data" },
      { status: 500 }
    );
  }
}
