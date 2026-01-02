import { db, notificationSettings } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "NotificationSettingsAPI";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the notification settings or create default ones if they don't exist
    let settings = await db.query.notificationSettings.findFirst({
      where: (notificationSettings, { eq }) => eq(notificationSettings.userId, userId),
    });

    if (!settings) {
      // Create default settings
      [settings] = await db
        .insert(notificationSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          emailNotifications: true,
          dailyEmailEnabled: true,
          eventInvites: true,
          eventUpdates: true,
          eventCancellations: true,
          eventReminders: true,
          defaultReminderTiming: "[30]",
        })
        .returning();
    }

    // Transform the response to match the store's structure
    return NextResponse.json({
      emailNotifications: settings.emailNotifications,
      dailyEmailEnabled: settings.dailyEmailEnabled,
      notifyFor: {
        eventInvites: settings.eventInvites,
        eventUpdates: settings.eventUpdates,
        eventCancellations: settings.eventCancellations,
        eventReminders: settings.eventReminders,
      },
      defaultReminderTiming: JSON.parse(settings.defaultReminderTiming),
    });
  } catch (error) {
    logger.error(
      "Failed to fetch notification settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch notification settings" },
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

    // Transform the updates to match the database schema
    const dbUpdates: Record<string, any> = {};
    if (updates.emailNotifications !== undefined) dbUpdates.emailNotifications = updates.emailNotifications;
    if (updates.dailyEmailEnabled !== undefined) dbUpdates.dailyEmailEnabled = updates.dailyEmailEnabled;
    if (updates.eventInvites !== undefined) dbUpdates.eventInvites = updates.eventInvites;
    if (updates.eventUpdates !== undefined) dbUpdates.eventUpdates = updates.eventUpdates;
    if (updates.eventCancellations !== undefined) dbUpdates.eventCancellations = updates.eventCancellations;
    if (updates.eventReminders !== undefined) dbUpdates.eventReminders = updates.eventReminders;
    if (updates.defaultReminderTiming !== undefined) {
      dbUpdates.defaultReminderTiming = JSON.stringify(updates.defaultReminderTiming);
    }

    // Check if settings exist
    let settings = await db.query.notificationSettings.findFirst({
      where: (notificationSettings, { eq }) => eq(notificationSettings.userId, userId),
    });

    if (settings) {
      // Update existing settings
      [settings] = await db
        .update(notificationSettings)
        .set(dbUpdates)
        .where(eq(notificationSettings.userId, userId))
        .returning();
    } else {
      // Create new settings with updates
      [settings] = await db
        .insert(notificationSettings)
        .values({
          id: crypto.randomUUID(),
          userId,
          emailNotifications: true,
          dailyEmailEnabled: true,
          eventInvites: true,
          eventUpdates: true,
          eventCancellations: true,
          eventReminders: true,
          defaultReminderTiming: "[30]",
          ...dbUpdates,
        })
        .returning();
    }

    // Transform the response to match the store's structure
    return NextResponse.json({
      emailNotifications: settings.emailNotifications,
      dailyEmailEnabled: settings.dailyEmailEnabled,
      notifyFor: {
        eventInvites: settings.eventInvites,
        eventUpdates: settings.eventUpdates,
        eventCancellations: settings.eventCancellations,
        eventReminders: settings.eventReminders,
      },
      defaultReminderTiming: JSON.parse(settings.defaultReminderTiming),
    });
  } catch (error) {
    logger.error(
      "Failed to update notification settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
}
