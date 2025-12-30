import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { RescheduleSuggestionService } from "@/services/adhd/RescheduleSuggestionService";

const LOG_SOURCE = "SuggestionsAPI";

// GET /api/adhd/suggestions?status=pending - Get schedule suggestions
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const suggestionService = new RescheduleSuggestionService();
    const suggestions = await suggestionService.getSuggestions(
      auth.userId,
      status as "pending" | "accepted" | "rejected"
    );

    return NextResponse.json(suggestions);
  } catch (error) {
    logger.error(
      "Failed to fetch suggestions",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}

// POST /api/adhd/suggestions/generate - Generate new suggestions
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const suggestionService = new RescheduleSuggestionService();
    const suggestions = await suggestionService.generateSuggestions(
      auth.userId
    );

    logger.info(
      "Suggestions generated",
      { count: suggestions.length },
      LOG_SOURCE
    );

    return NextResponse.json(suggestions, { status: 201 });
  } catch (error) {
    logger.error(
      "Failed to generate suggestions",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
