import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { MoodEnergyService } from "@/services/adhd/MoodEnergyService";

const LOG_SOURCE = "BestTimesAPI";

// GET /api/adhd/mood/best-times - Get best work times based on energy patterns
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const moodService = new MoodEnergyService();
    const bestTimes = await moodService.getBestWorkTimes(auth.userId);

    return NextResponse.json(bestTimes);
  } catch (error) {
    logger.error(
      "Failed to fetch best work times",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch best work times" },
      { status: 500 }
    );
  }
}
