import { db, calendarFeeds } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { GaxiosError } from "gaxios";

import { authenticateRequest } from "@/lib/auth/api-auth";


const LOG_SOURCE = "GoogleCalendarIdAPI";

interface UpdateRequest {
  enabled?: boolean;
  color?: string;
}

// Update a Google Calendar feed
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
    const feed = await db.query.calendarFeeds.findFirst({
      where: (feeds, { eq, and }) => and(
        eq(feeds.id, id),
        eq(feeds.userId, userId)
      ),
      with: { account: true },
    });

    if (!feed || feed.type !== "GOOGLE" || !feed.url || !feed.accountId) {
      return NextResponse.json(
        { error: "Invalid calendar feed" },
        { status: 400 }
      );
    }

    const updates = (await request.json()) as UpdateRequest;

    // Update only local properties
    const [updatedFeed] = await db.update(calendarFeeds)
      .set({
        enabled: updates.enabled,
        color: updates.color,
      })
      .where(and(
        eq(calendarFeeds.id, id),
        eq(calendarFeeds.userId, userId)
      ))
      .returning();

    return NextResponse.json(updatedFeed);
  } catch (error) {
    console.error("Failed to update Google calendar:", error);
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update calendar" },
      { status: 500 }
    );
  }
}

// Delete a Google Calendar feed
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
    const feed = await db.query.calendarFeeds.findFirst({
      where: (feeds, { eq, and }) => and(
        eq(feeds.id, id),
        eq(feeds.userId, userId)
      ),
    });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    // Delete the feed
    await db.delete(calendarFeeds)
      .where(and(
        eq(calendarFeeds.id, id),
        eq(calendarFeeds.userId, userId)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete Google calendar:", error);
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete calendar" },
      { status: 500 }
    );
  }
}
