import { db, connectedAccounts } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { GaxiosError } from "gaxios";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { getGoogleCalendarClient } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "GoogleAvailableCalendarsAPI";

// Get available (unconnected) calendars for an account
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Get the account and ensure it belongs to the current user
    const account = await db.query.connectedAccounts.findFirst({
      where: (accounts, { eq, and }) => and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId)
      ),
      with: {
        calendars: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        {
          error: "Account not found or you don't have permission to access it",
        },
        { status: 404 }
      );
    }

    if (account.provider !== "GOOGLE") {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }

    // Create calendar client
    const calendar = await getGoogleCalendarClient(accountId, userId);

    // Get list of calendars
    const calendarList = await calendar.calendarList.list();
    const availableCalendars = calendarList.data.items
      ?.filter((cal): cal is typeof cal & { id: string; summary: string } => {
        // Only include calendars that:
        // 1. Have an ID and name
        // 2. Are not already connected
        // 3. User has write access
        return (
          !!cal.id &&
          !!cal.summary &&
          // Intentional workaround for Drizzle type inference bug with JSON array fields
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          !((account.calendars as any[]) || []).some((f: any) => f.url === cal.id)
        );
      })
      .map((cal) => ({
        id: cal.id,
        name: cal.summary,
        color: cal.backgroundColor,
        accessRole: cal.accessRole,
      }));

    return NextResponse.json(availableCalendars || []);
  } catch (error) {
    logger.error(
      "Failed to list available calendars:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to list calendars" },
      { status: 500 }
    );
  }
}
