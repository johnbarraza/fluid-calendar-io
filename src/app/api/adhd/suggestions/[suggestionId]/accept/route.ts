import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { RescheduleSuggestionService } from "@/services/adhd/RescheduleSuggestionService";

const LOG_SOURCE = "AcceptSuggestionAPI";

// POST /api/adhd/suggestions/[suggestionId]/accept - Accept a suggestion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { suggestionId } = await params;
    const suggestionService = new RescheduleSuggestionService();
    const task = await suggestionService.acceptSuggestion(
      suggestionId,
      auth.userId
    );

    logger.info(
      "Suggestion accepted",
      { suggestionId, taskId: task.id },
      LOG_SOURCE
    );

    return NextResponse.json({ success: true, task });
  } catch (error) {
    logger.error(
      "Failed to accept suggestion",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to accept suggestion" },
      { status: 500 }
    );
  }
}
