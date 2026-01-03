import { NextRequest, NextResponse } from "next/server";
import { db, tasks, autoScheduleSettings } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { BreakProtectionService } from "@/services/adhd/BreakProtectionService";

const LOG_SOURCE = "BreakValidationAPI";

// POST /api/adhd/breaks/validate - Validate schedule for break violations
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();
    const { taskIds } = body;

    // Get tasks and settings
    const tasks = await db.query.tasks.findMany({
      where: (table, { eq, and, inArray }) => and(
        inArray(table.id, taskIds),
        eq(table.userId, auth.userId)
      ),
    });

    const settings = await db.query.autoScheduleSettings.findFirst({
      where: (table, { eq }) => eq(table.userId, auth.userId),
    });

    if (!settings) {
      return NextResponse.json(
        { error: "Auto-schedule settings not found" },
        { status: 404 }
      );
    }

    const breakService = new BreakProtectionService();
    const violations = await breakService.validateScheduleBreaks(
      tasks,
      settings
    );

    return NextResponse.json({ violations });
  } catch (error) {
    logger.error(
      "Failed to validate breaks",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to validate breaks" },
      { status: 500 }
    );
  }
}
