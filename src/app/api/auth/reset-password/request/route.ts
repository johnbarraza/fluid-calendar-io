import { db, users, passwordResets, accounts } from "@/db";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import crypto from "crypto";

import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "ResetPasswordRequestAPI";

/**
 * POST /api/auth/reset-password/request
 * Request a password reset token
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      logger.warn("Missing email in password reset request", {}, LOG_SOURCE);
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find the user
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    // Don't reveal if the user exists or not
    if (!user) {
      logger.info(
        "Password reset requested for non-existent user",
        { email },
        LOG_SOURCE
      );
      return NextResponse.json({
        message:
          "If an account exists, you will receive a password reset email",
      });
    }

    // Check if user has a credentials account
    const credentialsAccount = await db.query.accounts.findFirst({
      where: (accounts, { and, eq }) =>
        and(eq(accounts.userId, user.id), eq(accounts.provider, "credentials")),
    });

    if (!credentialsAccount) {
      logger.info(
        "Password reset requested for user without credentials",
        { email },
        LOG_SOURCE
      );
      return NextResponse.json({
        message:
          "If an account exists, you will receive a password reset email",
      });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store the reset token
    await db.insert(passwordResets).values({
      id: crypto.randomUUID(),
      userId: user.id,
      token: resetToken,
      expiresAt: resetTokenExpiry,
    });

    // Send the password reset email
    await sendPasswordResetEmail({
      email: user.email!,
      name: user.name || "there",
      resetToken,
      expirationDate: resetTokenExpiry,
    });

    return NextResponse.json({
      message: "If an account exists, you will receive a password reset email",
    });
  } catch (error) {
    logger.error(
      "Error in password reset request",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
