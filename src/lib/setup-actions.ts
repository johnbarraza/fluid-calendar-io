"use server";

import { db, users } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "SetupActions";

/**
 * Checks if setup is needed by checking if any users exist in the database
 * @returns {Promise<{needsSetup: boolean}>} Object with needsSetup flag
 */
export async function checkSetupStatus() {
  try {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const userCount = result[0]?.count || 0;

    logger.info("Checked if users exist", { userCount }, LOG_SOURCE);

    return { needsSetup: userCount === 0 };
  } catch (error) {
    logger.error(
      "Failed to check if users exist",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    // If there's an error, assume setup is needed
    return { needsSetup: true };
  }
}
