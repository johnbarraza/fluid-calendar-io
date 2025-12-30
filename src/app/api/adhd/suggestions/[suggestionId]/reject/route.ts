import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { RescheduleSuggestionService } from "@/services/adhd/RescheduleSuggestionService";

const LOG_SOURCE = "RejectSuggestionAPI";

// POST /api/adhd/suggestions/[suggestionId]/reject - Reject a suggestion
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
    await suggestionService.rejectSuggestion(suggestionId, auth.userId);

    logger.info("Suggestion rejected", { suggestionId }, LOG_SOURCE);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to reject suggestion",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to reject suggestion" },
      { status: 500 }
    );
  }
}
