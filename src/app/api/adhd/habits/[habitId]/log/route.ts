import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { HabitTrackingService } from "@/services/adhd/HabitTrackingService";

const LOG_SOURCE = "HabitLogAPI";

// POST /api/adhd/habits/[habitId]/log - Log habit completion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { habitId } = await params;
    const body = await request.json();
    const { note, mood } = body;

    const habitService = new HabitTrackingService();
    const log = await habitService.logHabitCompletion(
      habitId,
      auth.userId,
      note,
      mood
    );

    logger.info("Habit logged", { habitId, logId: log.id }, LOG_SOURCE);

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    logger.error(
      "Failed to log habit",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to log habit" },
      { status: 500 }
    );
  }
}
