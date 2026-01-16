import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getFitbitAuthUrl, generateState } from "@/lib/fitbit-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitAuthRoute";

/**
 * Initiate Fitbit OAuth flow
 * GET /api/fitbit/auth
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated using the same helper as other routes
    const auth = await authenticateRequest(request, LOG_SOURCE);

    if ("response" in auth && auth.response) {
      // User is not authenticated, redirect to signin
      logger.warn("Unauthenticated Fitbit auth attempt", {}, LOG_SOURCE);
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }

    const userId = auth.userId;

    // Generate state parameter with user ID
    const state = generateState(userId);

    // Generate Fitbit authorization URL
    const authUrl = getFitbitAuthUrl(state);

    logger.info(
      "Redirecting to Fitbit OAuth",
      { userId },
      LOG_SOURCE
    );

    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error(
      "Failed to initiate Fitbit OAuth",
      { error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to initiate Fitbit authentication" },
      { status: 500 }
    );
  }
}

