import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { db, calendarFeeds } from "@/db";
import { eq, and } from "drizzle-orm";

const LOG_SOURCE = "calendar-feed-route";

// Get a specific feed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const feed = await db.query.calendarFeeds.findFirst({
      where: and(eq(calendarFeeds.id, id), eq(calendarFeeds.userId, userId)),
      with: { events: true },
    });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    return NextResponse.json(feed);
  } catch (error) {
    logger.error(
      "Failed to fetch feed:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    );
  }
}

// Update a specific feed
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const updates = await request.json();
    const [updated] = await db
      .update(calendarFeeds)
      .set(updates)
      .where(and(eq(calendarFeeds.id, id), eq(calendarFeeds.userId, userId)))
      .returning();
    return NextResponse.json(updated);
  } catch (error) {
    logger.error(
      "Failed to update feed:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update feed" },
      { status: 500 }
    );
  }
}

// Delete a specific feed
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    // The feed's events will be automatically deleted due to the cascade delete in the schema
    await db
      .delete(calendarFeeds)
      .where(and(eq(calendarFeeds.id, id), eq(calendarFeeds.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to delete feed:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to delete feed" },
      { status: 500 }
    );
  }
}
