import { db, calendarFeeds, connectedAccounts } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { getOutlookClient } from "@/lib/outlook-calendar";
import { syncOutlookCalendar } from "@/lib/outlook-sync";


const LOG_SOURCE = "OutlookCalendarSyncAPI";

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to sync calendars." },
    { status: 405 }
  );
}

// Shared sync function

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const body = await req.json();
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

    if (!account || account.provider !== "OUTLOOK") {
      return NextResponse.json(
        { error: "Invalid Outlook account" },
        { status: 400 }
      );
    }

    // Check if calendar already exists
    const existingFeed = await db.query.calendarFeeds.findFirst({
      where: (feeds, { eq, and }) =>
        and(
          eq(feeds.type, "OUTLOOK"),
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
      type: "OUTLOOK",
      url: calendarId,
      color: color || "#3b82f6",
      enabled: true,
      accountId: account.id,
      userId,
    }).returning();

    // Sync events for this calendar
    const client = await getOutlookClient(accountId, userId);
    // Before syncing, check and cast the URL
    if (!feed.url) {
      return NextResponse.json(
        { error: "Calendar URL is required" },
        { status: 400 }
      );
    }
    await syncOutlookCalendar(
      client,
      { id: feed.id, url: feed.url as string },
      null
    );

    return NextResponse.json(feed);
  } catch (error) {
    logger.error(
      "Failed to add Outlook calendar",
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

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const body = await req.json();
    const { feedId } = body;

    if (!feedId) {
      return NextResponse.json(
        { error: "Feed ID is required" },
        { status: 400 }
      );
    }

    // Get the feed and ensure it belongs to the current user
    const feed = await db.query.calendarFeeds.findFirst({
      where: (feeds, { eq, and }) =>
        and(eq(feeds.id, feedId), eq(feeds.userId, userId)),
      with: { account: true },
    });

    if (!feed || !feed.account) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    logger.error(
      "Starting Outlook calendar sync",
      {
        feedId: String(feedId),
        timestamp: new Date().toISOString(),
      },
      LOG_SOURCE
    );

    // Get events from Outlook
    const client = await getOutlookClient(feed.account.id, userId);
    if (!feed.url) {
      return NextResponse.json(
        { error: "Calendar URL is required" },
        { status: 400 }
      );
    }
    const { processedEventIds, nextSyncToken } = await syncOutlookCalendar(
      client,
      { id: feed.id, url: feed.url as string },
      feed.syncToken,
      true
    );

    // Update the feed's sync token
    if (nextSyncToken) {
      await db
        .update(calendarFeeds)
        .set({
          syncToken: nextSyncToken,
        })
        .where(
          and(eq(calendarFeeds.id, feed.id), eq(calendarFeeds.userId, userId))
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

    logger.debug(
      "Completed Outlook calendar sync",
      {
        feedId: String(feedId),
        processedEvents: String(processedEventIds.size),
      },
      LOG_SOURCE
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to sync Outlook calendar",
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
