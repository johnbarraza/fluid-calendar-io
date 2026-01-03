import { db, accounts, passwordResets } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { hash } from "bcrypt";
import { z } from "zod";

import { logger } from "@/lib/logger";


const LOG_SOURCE = "ResetPasswordAPI";

// Validation schema for reset request
const resetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

/**
 * POST /api/auth/reset-password/reset
 * Reset password using a valid token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = resetSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid reset password request",
        {
          errors: result.error.errors.map((err) => err.message),
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          error: "Invalid request",
          details: result.error.errors,
        },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Find the reset token
    const resetRequest = await db.query.passwordResets.findFirst({
      where: (table, { eq, and, gt, isNull }) => and(
        eq(table.token, token),
        gt(table.expiresAt, new Date()),
        isNull(table.usedAt)
      ),
      with: {
        user: {
          with: {
            accounts: true,
          },
        },
      },
    });

    // Filter accounts to find credentials account
    const credentialsAccount = resetRequest?.user?.accounts?.find(
      (acc) => acc.provider === "credentials"
    );

    if (
      !resetRequest ||
      !resetRequest.user ||
      !credentialsAccount
    ) {
      logger.warn("Invalid or expired reset token used", { token }, LOG_SOURCE);
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hash(password, 10);

    // Update the password and mark token as used
    await db.transaction(async (tx) => {
      await tx.update(accounts)
        .set({ id_token: hashedPassword })
        .where(eq(accounts.id, credentialsAccount.id));

      await tx.update(passwordResets)
        .set({ usedAt: new Date() })
        .where(eq(passwordResets.id, resetRequest.id));
    });

    logger.info(
      "Password reset successful",
      { userId: resetRequest.userId },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    logger.error(
      "Error in password reset",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
