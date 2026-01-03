import { db, fitbitAccounts } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import {
  exchangeFitbitCode,
  getFitbitProfile,
  validateState,
  calculateExpiry,
} from "@/lib/fitbit-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitCallbackRoute";

/**
 * Handle Fitbit OAuth callback
 * GET /api/fitbit/callback?code=xxx&state=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth error
    if (error) {
      logger.error(
        "Fitbit OAuth error",
        { error, description: searchParams.get("error_description") },
        LOG_SOURCE
      );

      return NextResponse.redirect(
        new URL("/settings?fitbit=error", request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      logger.error("Missing code or state in Fitbit callback", {}, LOG_SOURCE);
      return NextResponse.redirect(
        new URL("/settings?fitbit=invalid", request.url)
      );
    }

    // Validate state and extract user ID
    const userId = validateState(state);

    logger.info(
      "Processing Fitbit OAuth callback",
      { userId },
      LOG_SOURCE
    );

    // Exchange code for tokens
    const tokens = await exchangeFitbitCode(code);

    // Get Fitbit user profile
    const profile = await getFitbitProfile(tokens.access_token);

    // Store tokens in database (upsert pattern)
    let fitbitAccount = await db.query.fitbitAccounts.findFirst({
      where: (accounts, { eq }) => eq(accounts.userId, userId),
    });

    const accountData = {
      fitbitUserId: profile.user.encodedId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: calculateExpiry(tokens.expires_in),
      scope: tokens.scope,
    };

    if (fitbitAccount) {
      await db
        .update(fitbitAccounts)
        .set(accountData)
        .where(eq(fitbitAccounts.userId, userId));
    } else {
      await db.insert(fitbitAccounts).values({
        id: crypto.randomUUID(),
        userId,
        ...accountData,
      });
    }

    logger.info(
      "Successfully connected Fitbit account",
      { userId, fitbitUserId: profile.user.encodedId },
      LOG_SOURCE
    );

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL("/settings?fitbit=connected", request.url)
    );
  } catch (error) {
    logger.error(
      "Failed to process Fitbit callback",
      { error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return NextResponse.redirect(
      new URL("/settings?fitbit=error", request.url)
    );
  }
}
