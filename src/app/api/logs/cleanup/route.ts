import { db, logs } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { newDate } from "@/lib/date-utils";


export async function POST() {
  try {
    // Delete all expired logs
    await db.delete(logs)
      .where(lte(logs.expiresAt, newDate()));

    // Count deleted logs
    const countResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(logs)
      .where(lte(logs.expiresAt, newDate()));

    const count = countResult[0]?.count || 0;

    return NextResponse.json({
      message: `Cleaned up ${count} expired logs`,
      count,
    });
  } catch (error) {
    console.error("Failed to cleanup logs:", error);
    return NextResponse.json(
      { error: "Failed to cleanup logs" },
      { status: 500 }
    );
  }
}
