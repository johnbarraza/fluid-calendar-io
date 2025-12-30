import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { PomodoroService } from "@/services/adhd/PomodoroService";

const LOG_SOURCE = "PomodoroAPI";

// POST /api/adhd/pomodoro - Start a new Pomodoro session
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();
    const { taskId, workDuration, breakDuration, type } = body;

    logger.info("Starting Pomodoro session via API", {
      userId: auth.userId,
      taskId,
      workDuration,
      breakDuration,
      type
    }, LOG_SOURCE);

    const pomodoroService = new PomodoroService();
    const session = await pomodoroService.startSession(auth.userId, taskId, {
      workDuration,
      breakDuration,
      type,
    });

    logger.info(
      "Pomodoro session started",
      { sessionId: session.id, type: session.type },
      LOG_SOURCE
    );

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      "Failed to start Pomodoro session",
      { error: errorMessage, stack: errorStack || "No stack trace" },
      LOG_SOURCE
    );
    console.error("[PomodoroAPI] Start session error:", errorMessage, errorStack);

    return NextResponse.json(
      {
        error: "Failed to start Pomodoro session",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// GET /api/adhd/pomodoro?days=7 - Get recent Pomodoro sessions
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    const pomodoroService = new PomodoroService();
    const sessions = await pomodoroService.getSessionHistory(
      auth.userId,
      days
    );

    return NextResponse.json(sessions);
  } catch (error) {
    logger.error(
      "Failed to fetch Pomodoro sessions",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch Pomodoro sessions" },
      { status: 500 }
    );
  }
}
