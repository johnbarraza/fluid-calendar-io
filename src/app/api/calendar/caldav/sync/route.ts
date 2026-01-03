import { db, calendarFeeds, connectedAccounts } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { CalDAVCalendarService } from "@/lib/caldav-calendar";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "CalDAVCalendarSyncAPI";

/**
 * API route for syncing a CalDAV calendar
 * PUT /api/calendar/caldav/sync
 * Body: { feedId }
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const body = await req.json();
    const { feedId } = body;

    logger.info(
      "Starting CalDAV calendar sync",
      {
        feedId: String(feedId),
        timestamp: new Date().toISOString(),
      },
      LOG_SOURCE
    );

    if (!feedId) {
      return NextResponse.json(
        { error: "Calendar feed ID is required" },
        { status: 400 }
      );
    }

    // Get the calendar feed and account
    const feed = await db.query.calendarFeeds.findFirst({
      where: (feeds, { eq, and }) =>
        and(eq(feeds.id, feedId), eq(feeds.userId, userId)),
      with: { account: true },
    });

    if (!feed || !feed.account || feed.type !== "CALDAV") {
      logger.error(
        "Invalid CalDAV calendar",
        {
          feed: JSON.stringify(feed),
          timestamp: new Date().toISOString(),
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Invalid CalDAV calendar" },
        { status: 400 }
      );
    }

    // Ensure we have the required CalDAV fields
    if (
      !feed.url ||
      !feed.account.caldavUsername ||
      !feed.account.accessToken
    ) {
      logger.error(
        "Missing required CalDAV fields",
        {
          hasUrl: !!feed.url,
          hasUsername: !!feed.account.caldavUsername,
          hasPassword: !!feed.account.accessToken,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Missing required CalDAV fields" },
        { status: 400 }
      );
    }

    // Create CalDAV service
    const caldavService = new CalDAVCalendarService(feed.account);

    // Sync calendar
    try {
      await caldavService.syncCalendar(feed.id, feed.url, userId);
    } catch (syncError) {
      logger.error(
        "Failed to sync CalDAV calendar",
        {
          error:
            syncError instanceof Error ? syncError.message : String(syncError),
          feedId,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          error: "Failed to sync CalDAV calendar",
          details:
            syncError instanceof Error ? syncError.message : String(syncError),
        },
        { status: 500 }
      );
    }

    // Update the feed's sync status
    await db
      .update(calendarFeeds)
      .set({
        lastSync: newDate(),
      })
      .where(
        and(eq(calendarFeeds.id, feed.id), eq(calendarFeeds.userId, userId))
      );

    logger.info(
      "Completed CalDAV calendar sync",
      {
        feedId: String(feedId),
      },
      LOG_SOURCE
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to sync CalDAV calendar",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}

/**
 * API route for adding a CalDAV calendar and performing initial sync
 * POST /api/calendar/caldav/sync
 * Body: { accountId, calendarId, name, color }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const body = await request.json();
    const { accountId, calendarId, name, color } = body;

    if (!accountId || !calendarId) {
      return NextResponse.json(
        { error: "Account ID and Calendar ID are required" },
        { status: 400 }
      );
    }

    // Get the account and ensure it belongs to the current user
    const account = await db.query.connectedAccounts.findFirst({
      where: (accounts, { eq, and }) =>
        and(eq(accounts.id, accountId), eq(accounts.userId, userId)),
    });

    if (!account || account.provider !== "CALDAV") {
      return NextResponse.json(
        { error: "Invalid CalDAV account" },
        { status: 400 }
      );
    }

    // Check if calendar already exists
    const existingFeed = await db.query.calendarFeeds.findFirst({
      where: (feeds, { eq, and }) =>
        and(
          eq(feeds.type, "CALDAV"),
          eq(feeds.url, calendarId),
          eq(feeds.accountId, accountId),
          eq(feeds.userId, userId)
        ),
    });

    if (existingFeed) {
      return NextResponse.json(existingFeed);
    }

    // Create calendar feed
    const [feed] = await db.insert(calendarFeeds).values({
      id: crypto.randomUUID(),
      name,
      type: "CALDAV",
      url: calendarId,
      color: color || "#4285F4",
      enabled: true,
      accountId: account.id,
      userId,
    }).returning();

    // Sync events for this calendar
    const caldavService = new CalDAVCalendarService(account);

    try {
      await caldavService.syncCalendar(feed.id, calendarId, userId);
    } catch (syncError) {
      logger.error(
        "Failed to perform initial sync of CalDAV calendar",
        {
          error:
            syncError instanceof Error ? syncError.message : String(syncError),
          calendarId,
          accountId,
        },
        LOG_SOURCE
      );
      // Don't return an error here, as we've already created the feed
    }

    return NextResponse.json(feed);
  } catch (error) {
    logger.error(
      "Failed to add CalDAV calendar",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to add calendar" },
      { status: 500 }
    );
  }
}
