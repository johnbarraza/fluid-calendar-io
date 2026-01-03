import { db, connectedAccounts, fitbitAccounts } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { getOutlookCredentials } from "@/lib/auth";
import { createGoogleOAuthClient } from "@/lib/google";

import { refreshFitbitTokens } from "@/lib/fitbit-auth";

import { newDate } from "./date-utils";
import { MICROSOFT_GRAPH_AUTH_ENDPOINTS } from "./outlook";

export type Provider = "GOOGLE" | "OUTLOOK" | "CALDAV" | "FITBIT";

interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export class TokenManager {
  private static instance: TokenManager;
  private constructor() {}

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async getTokens(
    accountId: string,
    userId: string
  ): Promise<TokenInfo | null> {
    const account = await db.query.connectedAccounts.findFirst({
      where: (accounts, { eq, and }) => and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId)
      ),
    });

    if (!account) {
      return null;
    }

    return {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken || undefined,
      expiresAt: account.expiresAt,
    };
  }

  async refreshGoogleTokens(
    accountId: string,
    userId: string
  ): Promise<TokenInfo | null> {
    const account = await db.query.connectedAccounts.findFirst({
      where: (accounts, { eq, and }) => and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId)
      ),
    });

    if (!account || !account.refreshToken) {
      return null;
    }

    const oauth2Client = await createGoogleOAuthClient({
      redirectUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
    });

    oauth2Client.setCredentials({
      refresh_token: account.refreshToken,
    });

    try {
      const response = await oauth2Client.refreshAccessToken();
      const expiresAt = newDate(
        Date.now() + (response.credentials.expiry_date || 3600 * 1000)
      );

      // Update tokens in database
      const [updatedAccount] = await db.update(connectedAccounts)
        .set({
          accessToken: response.credentials.access_token!,
          refreshToken:
            response.credentials.refresh_token || account.refreshToken,
          expiresAt,
        })
        .where(and(eq(connectedAccounts.id, accountId), eq(connectedAccounts.userId, userId)))
        .returning();

      return {
        accessToken: updatedAccount.accessToken,
        refreshToken: updatedAccount.refreshToken || undefined,
        expiresAt: updatedAccount.expiresAt,
      };
    } catch (error) {
      console.error("Failed to refresh Google tokens:", error);
      return null;
    }
  }

  async storeTokens(
    provider: Provider,
    email: string,
    tokens: {
      accessToken: string;
      refreshToken?: string;
      expiresAt: Date;
    },
    userId: string
  ): Promise<string> {
    // Try to find existing account
    const account = await db.query.connectedAccounts.findFirst({
      where: (accounts, { eq, and }) =>
        and(
          eq(accounts.userId, userId),
          eq(accounts.provider, provider),
          eq(accounts.email, email)
        ),
    });

    if (account) {
      // Update existing account
      const [updatedAccount] = await db
        .update(connectedAccounts)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        })
        .where(eq(connectedAccounts.id, account.id))
        .returning();
      return updatedAccount.id;
    } else {
      // Create new account
      const [newAccount] = await db
        .insert(connectedAccounts)
        .values({
          id: crypto.randomUUID(),
          provider,
          email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          userId,
        })
        .returning();
      return newAccount.id;
    }
  }

  async refreshOutlookTokens(
    accountId: string,
    userId: string
  ): Promise<TokenInfo | null> {
    const account = await db.query.connectedAccounts.findFirst({
      where: (accounts, { eq, and }) => and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId)
      ),
    });

    if (!account || !account.refreshToken) {
      return null;
    }

    // Get credentials using the helper function
    const { clientId, clientSecret } = await getOutlookCredentials();

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    });

    try {
      const response = await fetch(MICROSOFT_GRAPH_AUTH_ENDPOINTS.token, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      const expiresAt = newDate(Date.now() + data.expires_in * 1000);

      // Update tokens in database
      const [updatedAccount] = await db.update(connectedAccounts)
        .set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || account.refreshToken,
          expiresAt,
        })
        .where(and(eq(connectedAccounts.id, accountId), eq(connectedAccounts.userId, userId)))
        .returning();

      return {
        accessToken: updatedAccount.accessToken,
        refreshToken: updatedAccount.refreshToken || undefined,
        expiresAt: updatedAccount.expiresAt,
      };
    } catch (error) {
      console.error("Failed to refresh Outlook tokens:", error);
      return null;
    }
  }

  // For CalDAV, we don't need to refresh tokens as we store the password directly
  // This method is provided for consistency with other providers
  async refreshCalDAVTokens(
    accountId: string,
    userId: string
  ): Promise<TokenInfo | null> {
    const account = await db.query.connectedAccounts.findFirst({
      where: (accounts, { eq, and }) => and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId)
      ),
    });

    if (!account) {
      return null;
    }

    // For CalDAV, we just return the existing tokens
    return {
      accessToken: account.accessToken,
      expiresAt: account.expiresAt,
    };
  }

  /**
   * Get Fitbit tokens for a user
   */
  async getFitbitTokens(userId: string): Promise<string | null> {
    const account = await db.query.fitbitAccounts.findFirst({ where: (fitbitAccounts, { eq }) => eq(fitbitAccounts.userId, userId),
    });

    if (!account) {
      return null;
    }

    // Check if token is expired
    if (new Date(account.expiresAt) < new Date()) {
      return await this.refreshFitbitTokens(userId);
    }

    return account.accessToken;
  }

  /**
   * Refresh Fitbit tokens for a user
   */
  async refreshFitbitTokens(userId: string): Promise<string | null> {
    const account = await db.query.fitbitAccounts.findFirst({ where: (fitbitAccounts, { eq }) => eq(fitbitAccounts.userId, userId),
    });

    if (!account?.refreshToken) {
      return null;
    }

    try {
      const newTokens = await refreshFitbitTokens(account.refreshToken);

      const [updatedAccount] = await db.update(fitbitAccounts)
        .set({
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token || account.refreshToken,
          expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
        })
        .where(eq(fitbitAccounts.userId, userId))
        .returning();

      return updatedAccount.accessToken;
    } catch (error) {
      console.error("Failed to refresh Fitbit tokens:", error);
      return null;
    }
  }
}
