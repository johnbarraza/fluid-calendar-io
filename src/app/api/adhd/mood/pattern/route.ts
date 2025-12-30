import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { MoodEnergyService } from "@/services/adhd/MoodEnergyService";

const LOG_SOURCE = "MoodPatternAPI";

// GET /api/adhd/mood/pattern?days=30 - Get mood pattern analysis
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const moodService = new MoodEnergyService();
    const pattern = await moodService.getMoodPattern(auth.userId, days);

    return NextResponse.json(pattern);
  } catch (error) {
    logger.error(
      "Failed to fetch mood pattern",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch mood pattern" },
      { status: 500 }
    );
  }
}
