import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { PomodoroService } from "@/services/adhd/PomodoroService";

const LOG_SOURCE = "PomodoroInterruptAPI";

// POST /api/adhd/pomodoro/[sessionId]/interrupt - Interrupt a Pomodoro session
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
    const body = await request.json();
    const { reason } = body;

    const pomodoroService = new PomodoroService();
    const session = await pomodoroService.interruptSession(sessionId, reason);

    logger.info(
      "Pomodoro session interrupted",
      { sessionId, reason },
      LOG_SOURCE
    );

    return NextResponse.json(session);
  } catch (error) {
    logger.error(
      "Failed to interrupt Pomodoro session",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to interrupt Pomodoro session" },
      { status: 500 }
    );
  }
}
