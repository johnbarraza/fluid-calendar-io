import { db, integrationSettings } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "IntegrationSettingsAPI";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the integration settings or create default ones if they don't exist
    let settings = await db.query.integrationSettings.findFirst({
      where: (integrationSettings, { eq }) => eq(integrationSettings.userId, userId),
    });

    if (!settings) {
      // Create default settings
      [settings] = await db
        .insert(integrationSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          googleCalendarEnabled: false,
          outlookCalendarEnabled: false,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to fetch integration settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch integration settings" },
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
    let settings = await db.query.integrationSettings.findFirst({
      where: (integrationSettings, { eq }) => eq(integrationSettings.userId, userId),
    });

    if (settings) {
      // Update existing settings
      [settings] = await db
        .update(integrationSettings)
        .set(updates)
        .where(eq(integrationSettings.userId, userId))
        .returning();
    } else {
      // Create new settings with updates
      [settings] = await db
        .insert(integrationSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          googleCalendarEnabled: false,
          outlookCalendarEnabled: false,
          ...updates,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to update integration settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update integration settings" },
      { status: 500 }
    );
  }
}
