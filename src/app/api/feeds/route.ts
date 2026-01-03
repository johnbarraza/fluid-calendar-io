import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { db, calendarFeeds, accounts } from "@/db";
import { eq, and, asc } from "drizzle-orm";

const LOG_SOURCE = "calendar-feeds-route";

interface CalendarFeedUpdate {
  id: string;
  enabled?: boolean;
  color?: string | null;
}

// List all calendar feeds
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const feeds = await db.query.calendarFeeds.findMany({
      where: eq(calendarFeeds.userId, userId),
      orderBy: asc(calendarFeeds.createdAt),
    });

    return NextResponse.json(feeds);
  } catch (error) {
    logger.error(
      "Failed to fetch calendar feeds:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch calendar feeds" },
      { status: 500 }
    );
  }
}

// Create a new feed
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const feedData = await request.json();
    const [created] = await db
      .insert(calendarFeeds)
      .values({
        ...feedData,
        // Associate the feed with the current user
        userId,
      })
      .returning();
    return NextResponse.json(created);
  } catch (error) {
    logger.error(
      "Failed to create feed:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to create feed" },
      { status: 500 }
    );
  }
}

// Batch update feeds
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { feeds } = await request.json();

    // Use transaction to ensure all updates succeed or none do
    await db.transaction(async (tx) => {
      for (const feed of feeds as CalendarFeedUpdate[]) {
        await tx
          .update(calendarFeeds)
          .set(feed)
          .where(
            and(eq(calendarFeeds.id, feed.id), eq(calendarFeeds.userId, userId))
          );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to update feeds:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update feeds" },
      { status: 500 }
    );
  }
}

// Update calendar feed settings
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id, enabled, color } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Feed ID is required" },
        { status: 400 }
      );
    }

    const updateData: Partial<typeof calendarFeeds.$inferInsert> = {};
    if (enabled !== undefined) updateData.enabled = enabled;
    if (color !== undefined) updateData.color = color;

    const [feed] = await db
      .update(calendarFeeds)
      .set(updateData)
      .where(and(eq(calendarFeeds.id, id), eq(calendarFeeds.userId, userId)))
      .returning();

    return NextResponse.json(feed);
  } catch (error) {
    logger.error(
      "Failed to update calendar feed:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update calendar feed" },
      { status: 500 }
    );
  }
}

// Delete calendar feed
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Feed ID is required" },
        { status: 400 }
      );
    }

    await db
      .delete(calendarFeeds)
      .where(and(eq(calendarFeeds.id, id), eq(calendarFeeds.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to delete calendar feed:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to delete calendar feed" },
      { status: 500 }
    );
  }
}
