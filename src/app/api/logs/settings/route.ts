import { db, systemSettings } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "LogSettingsAPI";

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    const settings = await db.query.systemSettings.findFirst();

    // If no settings exist, create default settings
    if (!settings) {
      logger.info(
        "No system settings found, creating defaults",
        {},
        LOG_SOURCE
      );

      const [defaultSettings] = await db.insert(systemSettings).values({
        id: crypto.randomUUID(),
        logLevel: "error",
        logDestination: "db",
        logRetention: {
          error: 30,
          warn: 14,
          info: 7,
          debug: 3,
        },
        publicSignup: false,
      }).returning();

      return NextResponse.json({
        logLevel: defaultSettings.logLevel,
        logDestination: defaultSettings.logDestination,
        logRetention: defaultSettings.logRetention,
      });
    }

    return NextResponse.json({
      logLevel: settings?.logLevel || "none",
      logDestination: settings?.logDestination || "db",
      logRetention: settings?.logRetention || {
        error: 30,
        warn: 14,
        info: 7,
        debug: 3,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to fetch log settings:",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch log settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { logLevel, logDestination, logRetention } = body;

    // Validate log level
    if (
      logLevel &&
      !["none", "debug", "info", "warn", "error"].includes(logLevel)
    ) {
      return NextResponse.json({ error: "Invalid log level" }, { status: 400 });
    }

    // Validate log destination
    if (logDestination && !["db", "file", "both"].includes(logDestination)) {
      return NextResponse.json(
        { error: "Invalid log destination" },
        { status: 400 }
      );
    }

    // Validate retention periods
    if (logRetention) {
      const levels = ["error", "warn", "info", "debug"];
      for (const level of levels) {
        if (
          typeof logRetention[level] !== "number" ||
          logRetention[level] < 1
        ) {
          return NextResponse.json(
            { error: `Invalid retention period for ${level}` },
            { status: 400 }
          );
        }
      }
    }

    let settingsInDb = await db.query.systemSettings.findFirst();

    // Update or create settings (upsert pattern)
    const updateData = {
      ...(logLevel && { logLevel }),
      ...(logDestination && { logDestination }),
      ...(logRetention && { logRetention }),
    };

    if (settingsInDb) {
      [settingsInDb] = await db
        .update(systemSettings)
        .set(updateData)
        .where(eq(systemSettings.id, settingsInDb.id))
        .returning();
    } else {
      [settingsInDb] = await db.insert(systemSettings).values({
        id: crypto.randomUUID(),
        logLevel: logLevel || "none",
        logDestination: logDestination || "db",
        logRetention: logRetention || {
          error: 30,
          warn: 14,
          info: 7,
          debug: 3,
        },
        publicSignup: false,
      }).returning();
    }

    const settings = settingsInDb;

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to update log settings:",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update log settings" },
      { status: 500 }
    );
  }
}
