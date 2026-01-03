import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitAuth";

export interface FitbitOAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
}

export interface FitbitTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  user_id: string;
}

export interface FitbitProfile {
  user: {
    encodedId: string;
    displayName: string;
    avatar: string;
  };
}

/**
 * Get Fitbit OAuth configuration
 */
export function getFitbitOAuthConfig(): FitbitOAuthConfig {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId || !clientSecret) {
    throw new Error("Fitbit OAuth credentials not configured");
  }

  return {
    clientId,
    clientSecret,
    authUrl: "https://www.fitbit.com/oauth2/authorize",
    tokenUrl: "https://api.fitbit.com/oauth2/token",
    redirectUri: `${appUrl}/api/fitbit/callback`,
  };
}

/**
 * Generate Fitbit authorization URL
 */
export function getFitbitAuthUrl(state: string): string {
  const config = getFitbitOAuthConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: "activity heartrate sleep nutrition profile",
    state,
  });

  const url = `${config.authUrl}?${params.toString()}`;

  logger.info(
    "Generated Fitbit auth URL",
    { redirectUri: config.redirectUri },
    LOG_SOURCE
  );

  return url;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeFitbitCode(
  code: string
): Promise<FitbitTokens> {
  const config = getFitbitOAuthConfig();

  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(
      "Failed to exchange Fitbit code",
      { status: response.status, error },
      LOG_SOURCE
    );
    throw new Error(`Fitbit token exchange failed: ${response.statusText}`);
  }

  const tokens: FitbitTokens = await response.json();

  logger.info(
    "Successfully exchanged Fitbit code for tokens",
    { userId: tokens.user_id },
    LOG_SOURCE
  );

  return tokens;
}

/**
 * Refresh Fitbit access token
 */
export async function refreshFitbitTokens(
  refreshToken: string
): Promise<FitbitTokens> {
  const config = getFitbitOAuthConfig();

  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(
      "Failed to refresh Fitbit token",
      { status: response.status, error },
      LOG_SOURCE
    );
    throw new Error(`Fitbit token refresh failed: ${response.statusText}`);
  }

  const tokens: FitbitTokens = await response.json();

  logger.info("Successfully refreshed Fitbit tokens", {}, LOG_SOURCE);

  return tokens;
}

/**
 * Get Fitbit user profile
 */
export async function getFitbitProfile(
  accessToken: string
): Promise<FitbitProfile> {
  const response = await fetch("https://api.fitbit.com/1/user/-/profile.json", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(
      "Failed to get Fitbit profile",
      { status: response.status, error },
      LOG_SOURCE
    );
    throw new Error(`Fitbit profile fetch failed: ${response.statusText}`);
  }

  const profile: FitbitProfile = await response.json();

  logger.info(
    "Successfully fetched Fitbit profile",
    { userId: profile.user.encodedId },
    LOG_SOURCE
  );

  return profile;
}

/**
 * Calculate token expiration timestamp
 */
export function calculateExpiry(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000);
}

/**
 * Generate a secure state parameter for OAuth
 */
export function generateState(userId: string): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const random = Array.from(randomBytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return Buffer.from(JSON.stringify({ userId, random })).toString("base64");
}

/**
 * Validate and decode state parameter
 */
export function validateState(state: string): string {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    const { userId } = JSON.parse(decoded);
    return userId;
  } catch (error) {
    logger.error(
      "Invalid OAuth state",
      { error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );
    throw new Error("Invalid OAuth state parameter");
  }
}
