import { db, logs as logsTable } from "@/db";
import { eq, and, or, like, gte, lte, lt, sql, count } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { newDate, subDays } from "@/lib/date-utils";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "LogsAPI";

export async function GET(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const level = searchParams.get("level");
    const source = searchParams.get("source");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");

    logger.debug(
      "Fetching logs with params",
      {
        page: String(page),
        limit: String(limit),
        level: level || "none",
        source: source || "none",
        from: from || "none",
        to: to || "none",
        search: search || "none",
      },
      LOG_SOURCE
    );

    // Build where conditions
    const conditions = [];
    if (level) conditions.push(eq(logsTable.level, level));
    if (source) conditions.push(eq(logsTable.source, source));
    if (from) conditions.push(gte(logsTable.timestamp, new Date(from)));
    if (to) conditions.push(lte(logsTable.timestamp, new Date(to)));
    if (search) {
      conditions.push(
        or(
          like(logsTable.message, `%${search}%`),
          like(logsTable.source, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(logsTable)
      .where(whereClause);

    // Get logs with pagination
    const logsList = await db.query.logs.findMany({
      where: whereClause,
      orderBy: (logs, { desc }) => [desc(logs.timestamp)],
      offset: (page - 1) * limit,
      limit: limit,
    });

    logger.debug(
      "Successfully fetched logs",
      {
        totalLogs: String(total),
        returnedLogs: String(logsList.length),
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      logs: logsList,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        limit,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to fetch logs",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const olderThan = searchParams.get("olderThan"); // days
    const level = searchParams.get("level");

    logger.info(
      "Deleting logs",
      {
        olderThan: olderThan || "none",
        level: level || "none",
      },
      LOG_SOURCE
    );

    // Build where conditions for deletion
    const deleteConditions = [];

    // Delete logs older than specified days
    if (olderThan) {
      deleteConditions.push(
        lt(logsTable.timestamp, subDays(newDate(), parseInt(olderThan)))
      );
    }

    // Delete logs of specific level
    if (level) {
      deleteConditions.push(eq(logsTable.level, level));
    }

    // Delete expired logs if no filters provided
    if (!olderThan && !level) {
      deleteConditions.push(lt(logsTable.expiresAt, newDate()));
    }

    const whereClause = deleteConditions.length > 0 ? and(...deleteConditions) : undefined;

    const result = await db
      .delete(logsTable)
      .where(whereClause)
      .returning();

    const deletedCount = result.length;

    logger.info(
      "Successfully deleted logs",
      {
        deletedCount: String(deletedCount),
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: `Deleted ${deletedCount} logs`,
      count: deletedCount,
    });
  } catch (error) {
    logger.error(
      "Failed to delete logs",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to delete logs" },
      { status: 500 }
    );
  }
}
