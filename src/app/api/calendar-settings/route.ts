import { db, calendarSettings } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "CalendarSettingsAPI";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the calendar settings or create default ones if they don't exist
    let settings = await db.query.calendarSettings.findFirst({
      where: (calendarSettings, { eq }) => eq(calendarSettings.userId, userId),
    });

    if (!settings) {
      // Create default settings
      [settings] = await db
        .insert(calendarSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          defaultCalendarId: null,
          defaultDuration: 30,
          defaultReminder: 15,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to fetch calendar settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch calendar settings" },
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
    let settings = await db.query.calendarSettings.findFirst({
      where: (calendarSettings, { eq }) => eq(calendarSettings.userId, userId),
    });

    if (settings) {
      // Update existing settings
      [settings] = await db
        .update(calendarSettings)
        .set(updates)
        .where(eq(calendarSettings.userId, userId))
        .returning();
    } else {
      // Create new settings with updates
      [settings] = await db
        .insert(calendarSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          defaultCalendarId: null,
          defaultDuration: 30,
          defaultReminder: 15,
          ...updates,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to update calendar settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update calendar settings" },
      { status: 500 }
    );
  }
}
