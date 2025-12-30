import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { BreakProtectionService } from "@/services/adhd/BreakProtectionService";

const LOG_SOURCE = "BreakSuggestionAPI";

// GET /api/adhd/breaks/suggest?date=2025-01-15 - Get break suggestions for a date
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const date = dateStr ? new Date(dateStr) : new Date();

    const breakService = new BreakProtectionService();
    const suggestions = await breakService.suggestBreaks(auth.userId, date);

    return NextResponse.json(suggestions);
  } catch (error) {
    logger.error(
      "Failed to suggest breaks",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to suggest breaks" },
      { status: 500 }
    );
  }
}
