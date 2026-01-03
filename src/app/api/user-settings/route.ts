import { db, userSettings } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "UserSettingsAPI";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the user settings or create default ones if they don't exist
    let settings = await db.query.userSettings.findFirst({
      where: (userSettings, { eq }) => eq(userSettings.userId, userId),
    });

    if (!settings) {
      [settings] = await db
        .insert(userSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to fetch user settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch user settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const updates = await request.json();

    let settings = await db.query.userSettings.findFirst({
      where: (userSettings, { eq }) => eq(userSettings.userId, userId),
    });

    if (settings) {
      [settings] = await db
        .update(userSettings)
        .set(updates)
        .where(eq(userSettings.userId, userId))
        .returning();
    } else {
      [settings] = await db
        .insert(userSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...updates,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to update user settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update user settings" },
      { status: 500 }
    );
  }
}
