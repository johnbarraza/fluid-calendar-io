import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/auth-options";
import { getFitbitAuthUrl, generateState } from "@/lib/fitbit-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitAuthRoute";

/**
 * Initiate Fitbit OAuth flow
 * GET /api/fitbit/auth
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      logger.warn("Unauthenticated Fitbit auth attempt", {}, LOG_SOURCE);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Generate state parameter with user ID
    const state = generateState(session.user.id);

    // Generate Fitbit authorization URL
    const authUrl = getFitbitAuthUrl(state);

    logger.info(
      "Redirecting to Fitbit OAuth",
      { userId: session.user.id },
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
