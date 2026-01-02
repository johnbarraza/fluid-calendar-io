import { db, users, accounts, userSettings } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { hash } from "bcrypt";

import { isPublicSignupEnabled } from "@/lib/auth/public-signup";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "RegisterAPI";

export async function POST(req: NextRequest) {
  try {
    // Check if public signup is enabled
    const publicSignupEnabled = await isPublicSignupEnabled();

    if (!publicSignupEnabled) {
      logger.warn(
        "Registration attempt when public signup is disabled",
        {},
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Public registration is disabled" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      logger.warn("Missing required fields for registration", {}, LOG_SOURCE);
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (existingUser) {
      logger.warn(
        "Registration attempt with existing email",
        { email },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Create the user with transaction to ensure all related records are created
    const result = await db.transaction(async (tx) => {
      // Create user
      const [newUser] = await tx
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          email,
          name: name || email.split("@")[0], // Use part of email as name if not provided
          emailVerified: null,
          image: null,
          password: null,
          role: "USER",
        })
        .returning();

      // Create credentials account
      await tx.insert(accounts).values({
        id: crypto.randomUUID(),
        userId: newUser.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: email,
        id_token: hashedPassword, // Store the hashed password in the id_token field
        refresh_token: null,
        access_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        session_state: null,
      });

      // Create user settings
      await tx.insert(userSettings).values({
        id: crypto.randomUUID(),
        userId: newUser.id,
        theme: "system",
        timeZone: "UTC",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
        weekStart: "sunday",
        language: "en",
      });

      return newUser;
    });

    logger.info(
      "User registered successfully",
      { userId: result.id },
      LOG_SOURCE
    );

    return NextResponse.json(
      { success: true, message: "User registered successfully" },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      "Error during user registration",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
