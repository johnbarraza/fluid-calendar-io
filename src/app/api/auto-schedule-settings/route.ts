import { db, autoScheduleSettings } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "AutoScheduleSettingsAPI";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the auto schedule settings or create default ones if they don't exist
    let settings = await db.query.autoScheduleSettings.findFirst({
      where: (autoScheduleSettings, { eq }) =>
        eq(autoScheduleSettings.userId, userId),
    });

    if (!settings) {
      // Create default settings
      [settings] = await db
        .insert(autoScheduleSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          workDays: JSON.stringify([1, 2, 3, 4, 5]), // Monday to Friday
          workHourStart: 9, // 9 AM
          workHourEnd: 17, // 5 PM
          bufferTimeBefore: 0,
          bufferTimeAfter: 0,
          minTaskDuration: 15,
          maxTaskDuration: 240,
          breakDuration: 15,
          breakInterval: 120,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to fetch auto schedule settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch auto schedule settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const updates = await request.json();

    // Check if settings exist
    let settings = await db.query.autoScheduleSettings.findFirst({
      where: (autoScheduleSettings, { eq }) =>
        eq(autoScheduleSettings.userId, userId),
    });

    if (settings) {
      // Update existing settings
      [settings] = await db
        .update(autoScheduleSettings)
        .set(updates)
        .where(eq(autoScheduleSettings.userId, userId))
        .returning();
    } else {
      // Create new settings with updates
      [settings] = await db
        .insert(autoScheduleSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          workDays: JSON.stringify([1, 2, 3, 4, 5]), // Monday to Friday
          workHourStart: 9, // 9 AM
          workHourEnd: 17, // 5 PM
          bufferTimeBefore: 0,
          bufferTimeAfter: 0,
          minTaskDuration: 15,
          maxTaskDuration: 240,
          breakDuration: 15,
          breakInterval: 120,
          ...updates,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to update auto schedule settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update auto schedule settings" },
      { status: 500 }
    );
  }
}
