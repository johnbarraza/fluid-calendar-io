import { db, calendarFeeds, connectedAccounts } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "accounts-route";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get accounts filtered by the current user's ID
    const accounts = await db.query.connectedAccounts.findMany({
      where: (accounts, { eq }) => eq(accounts.userId, userId),
      with: {
        calendars: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      accounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        email: account.email,
        calendars: account.calendars,
      }))
    );
  } catch (error) {
    logger.error(
      "Failed to list accounts:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to list accounts" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { accountId } = await request.json();
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Check if the account belongs to the current user
    const account = await db.query.connectedAccounts.findFirst({
      where: (accounts, { eq, and }) => and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId)
      ),
    });

    if (!account) {
      return NextResponse.json(
        {
          error: "Account not found or you don't have permission to delete it",
        },
        { status: 404 }
      );
    }

    // First delete all calendar feeds associated with this account
    await db.delete(calendarFeeds)
      .where(and(eq(calendarFeeds.accountId, accountId), eq(calendarFeeds.userId, userId)));

    // Then delete the account
    await db.delete(connectedAccounts)
      .where(and(eq(connectedAccounts.id, accountId), eq(connectedAccounts.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to remove account:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to remove account" },
      { status: 500 }
    );
  }
}
