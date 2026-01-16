import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { FitbitSyncService } from "@/services/fitbit/FitbitSyncService";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitSyncRoute";

/**
 * Manually trigger Fitbit data synchronization
 * POST /api/fitbit/sync
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);

    if ("response" in auth && auth.response) {
      logger.warn("Unauthenticated Fitbit sync request", {}, LOG_SOURCE);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

    // Parse optional date range from request body
    const body = await request.json().catch(() => ({}));
    const { days = 7 } = body;

    logger.info(
      "Starting manual Fitbit sync",
      { userId, days },
      LOG_SOURCE
    );

    const syncService = new FitbitSyncService();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Sync all data types for the date range
    await syncService.syncAll(userId, startDate, endDate);

    logger.info(
      "Fitbit sync completed successfully",
      { userId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      LOG_SOURCE
    );

    return NextResponse.json({
      success: true,
      message: `Synced ${days} days of Fitbit data`,
      syncedRange: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    logger.error(
      "Failed to sync Fitbit data",
      { error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    // Check if it's a token error
    if (error instanceof Error && error.message === "FITBIT_TOKEN_EXPIRED") {
      return NextResponse.json(
        { error: "Fitbit token expired. Please reconnect your account." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to sync Fitbit data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
