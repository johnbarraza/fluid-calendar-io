import { db, fitbitAccounts, fitbitActivities, fitbitSleep, fitbitHeartRate } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/auth-options";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitDisconnectRoute";

/**
 * Disconnect Fitbit account
 * DELETE /api/fitbit/disconnect
 */
export async function DELETE(request: NextRequest) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      logger.warn("Unauthenticated Fitbit disconnect request", {}, LOG_SOURCE);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse optional deleteData parameter
    const { searchParams } = new URL(request.url);
    const deleteData = searchParams.get("deleteData") === "true";

    logger.info(
      "Disconnecting Fitbit account",
      { userId, deleteData },
      LOG_SOURCE
    );

    // Delete Fitbit account (tokens)
    await prisma.fitbitAccount.delete({
      where: { userId },
    });

    // Optionally delete all synced data
    if (deleteData) {
      await db.transaction([
        prisma.fitbitActivity.deleteMany({ where: { userId } }),
        prisma.fitbitSleep.deleteMany({ where: { userId } }),
        prisma.fitbitHeartRate.deleteMany({ where: { userId } }),
      ]);

      logger.info(
        "Fitbit account and all data deleted",
        { userId },
        LOG_SOURCE
      );
    } else {
      logger.info(
        "Fitbit account deleted (data preserved)",
        { userId },
        LOG_SOURCE
      );
    }

    return NextResponse.json({
      success: true,
      message: deleteData
        ? "Fitbit account disconnected and all data deleted"
        : "Fitbit account disconnected (data preserved)",
    });
  } catch (error) {
    // If account doesn't exist, return success
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      logger.warn(
        "Attempted to disconnect non-existent Fitbit account",
        {},
        LOG_SOURCE
      );

      return NextResponse.json({
        success: true,
        message: "No Fitbit account to disconnect",
      });
    }

    logger.error(
      "Failed to disconnect Fitbit account",
      { error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return NextResponse.json(
      {
        error: "Failed to disconnect Fitbit account",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
