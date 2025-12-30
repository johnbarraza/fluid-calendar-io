import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { MoodEnergyService } from "@/services/adhd/MoodEnergyService";

const LOG_SOURCE = "MoodAPI";

// GET /api/adhd/mood?days=7 - Get mood entries
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const moodService = new MoodEnergyService();
    const entries = await moodService.getMoodEntries(auth.userId, startDate, endDate);

    return NextResponse.json(entries);
  } catch (error) {
    logger.error(
      "Failed to fetch mood entries",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch mood entries" },
      { status: 500 }
    );
  }
}

// POST /api/adhd/mood - Log a mood entry
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();
    const { mood, energyLevel, focus, anxiety, note, tags } = body;

    if (!mood || !energyLevel) {
      return NextResponse.json(
        { error: "Mood and energy level are required" },
        { status: 400 }
      );
    }

    const moodService = new MoodEnergyService();
    const entry = await moodService.logMoodEntry(auth.userId, {
      mood,
      energyLevel,
      focus,
      anxiety,
      note,
      tags,
    });

    logger.info("Mood entry logged", { entryId: entry.id }, LOG_SOURCE);

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    logger.error(
      "Failed to log mood entry",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to log mood entry" },
      { status: 500 }
    );
  }
}
