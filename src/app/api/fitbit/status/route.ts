import { db, fitbitAccounts } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitStatusRoute";

/**
 * Get Fitbit connection status
 * GET /api/fitbit/status
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);

    if ("response" in auth && auth.response) {
      logger.warn("Unauthenticated Fitbit status request", {}, LOG_SOURCE);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

    // Get Fitbit account
    const account = await db.query.fitbitAccounts.findFirst({
      where: (fitbitAccounts, { eq }) => eq(fitbitAccounts.userId, userId),
      columns: {
        id: true,
        fitbitUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!account) {
      return NextResponse.json({
        connected: false,
        account: null,
      });
    }

    logger.info(
      "Fitbit status retrieved",
      { userId, fitbitUserId: account.fitbitUserId },
      LOG_SOURCE
    );

    return NextResponse.json({
      connected: true,
      account: {
        id: account.id,
        fitbitUserId: account.fitbitUserId,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error(
      "Failed to get Fitbit status",
      { error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to get Fitbit status" },
      { status: 500 }
    );
  }
}
