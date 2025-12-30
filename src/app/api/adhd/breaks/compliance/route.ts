import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { BreakProtectionService } from "@/services/adhd/BreakProtectionService";

const LOG_SOURCE = "BreakComplianceAPI";

// GET /api/adhd/breaks/compliance?days=7 - Get break compliance score
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    const breakService = new BreakProtectionService();
    const score = await breakService.getBreakComplianceScore(
      auth.userId,
      days
    );

    return NextResponse.json({ score, days });
  } catch (error) {
    logger.error(
      "Failed to fetch compliance score",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch compliance score" },
      { status: 500 }
    );
  }
}
