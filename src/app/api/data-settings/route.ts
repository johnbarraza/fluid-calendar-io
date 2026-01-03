import { db, dataSettings } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "DataSettingsAPI";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the data settings or create default ones if they don't exist
    let settings = await db.query.dataSettings.findFirst({
      where: (dataSettings, { eq }) => eq(dataSettings.userId, userId),
    });

    if (!settings) {
      // Create default settings
      [settings] = await db
        .insert(dataSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          retainDataFor: 90,
          autoBackup: true,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to fetch data settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch data settings" },
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
    let settings = await db.query.dataSettings.findFirst({
      where: (dataSettings, { eq }) => eq(dataSettings.userId, userId),
    });

    if (settings) {
      // Update existing settings
      [settings] = await db
        .update(dataSettings)
        .set(updates)
        .where(eq(dataSettings.userId, userId))
        .returning();
    } else {
      // Create new settings with updates
      [settings] = await db
        .insert(dataSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          retainDataFor: 90,
          autoBackup: true,
          ...updates,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to update data settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update data settings" },
      { status: 500 }
    );
  }
}
