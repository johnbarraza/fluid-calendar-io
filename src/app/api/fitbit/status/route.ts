import { db, fitbitAccounts } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/auth-options";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitStatusRoute";

/**
 * Get Fitbit connection status
 * GET /api/fitbit/status
 */
export async function GET() {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      logger.warn("Unauthenticated Fitbit status request", {}, LOG_SOURCE);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get Fitbit account
    const account = await db.query.fitbitAccounts.findFirst({ where: (fitbitAccounts, { eq }) => eq(fitbitAccounts.userId, userId),
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
