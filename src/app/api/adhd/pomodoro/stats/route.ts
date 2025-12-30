import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { PomodoroService } from "@/services/adhd/PomodoroService";

const LOG_SOURCE = "PomodoroStatsAPI";

// GET /api/adhd/pomodoro/stats - Get productivity statistics
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const pomodoroService = new PomodoroService();
    const stats = await pomodoroService.getProductivityStats(auth.userId);

    return NextResponse.json(stats);
  } catch (error) {
    logger.error(
      "Failed to fetch Pomodoro stats",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch Pomodoro stats" },
      { status: 500 }
    );
  }
}
