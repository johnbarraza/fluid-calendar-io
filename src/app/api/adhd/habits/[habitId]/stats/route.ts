import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { HabitTrackingService } from "@/services/adhd/HabitTrackingService";

const LOG_SOURCE = "HabitStatsAPI";

// GET /api/adhd/habits/[habitId]/stats?timeframe=week|month|year
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { habitId } = await params;
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get("timeframe") ||
      "week") as "week" | "month" | "year";

    const habitService = new HabitTrackingService();
    const stats = await habitService.getHabitStats(habitId, timeframe);

    return NextResponse.json(stats);
  } catch (error) {
    logger.error(
      "Failed to fetch habit stats",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch habit stats" },
      { status: 500 }
    );
  }
}
