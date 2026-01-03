import { db, logs } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";


const LOG_SOURCE = "LogSourcesAPI";

export async function GET() {
  try {
    // Get all unique sources
    const sources = await db.query.logs.findMany({
      distinct: ["source"],
      columns: { source: true },
      where: {
        source: {
          not: null,
        },
      },
    });

    logger.debug(
      "Successfully fetched log sources",
      {
        sourceCount: String(sources.length),
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      sources: sources
        .map((s) => s.source)
        .filter(Boolean)
        .sort(),
    });
  } catch (error) {
    logger.error(
      "Failed to fetch log sources",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch log sources" },
      { status: 500 }
    );
  }
}
