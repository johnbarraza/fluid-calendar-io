import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { PomodoroService } from "@/services/adhd/PomodoroService";

const LOG_SOURCE = "PomodoroCompleteAPI";

// POST /api/adhd/pomodoro/[sessionId]/complete - Complete a Pomodoro session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { sessionId } = await params;
    const pomodoroService = new PomodoroService();
    const session = await pomodoroService.completeSession(sessionId);

    logger.info("Pomodoro session completed", { sessionId }, LOG_SOURCE);

    return NextResponse.json(session);
  } catch (error) {
    logger.error(
      "Failed to complete Pomodoro session",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to complete Pomodoro session" },
      { status: 500 }
    );
  }
}
