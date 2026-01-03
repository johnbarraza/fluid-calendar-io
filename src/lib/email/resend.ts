import { db, systemSettings } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { Resend } from "resend";

import { logger } from "@/lib/logger";
import { _registerClearCallback } from "./resend-client";


const LOG_SOURCE = "ResendAPI";

let resendInstance: Resend | null = null;

// Register the clear function with the client-safe module
_registerClearCallback(() => {
  resendInstance = null;
});

/**
 * Gets or creates a Resend instance using the API key from SystemSettings
 */
export async function getResend(): Promise<Resend> {
  try {
    // If we already have an instance, return it
    if (resendInstance) {
      return resendInstance;
    }

    // Get the API key from SystemSettings
    const settings = await db.query.systemSettings.findFirst();
    if (!settings?.resendApiKey) {
      throw new Error("Resend API key not found in system settings");
    }

    // Create and cache the instance
    resendInstance = new Resend(settings.resendApiKey);
    return resendInstance;
  } catch (error) {
    logger.error(
      "Failed to initialize Resend",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    throw error;
  }
}
