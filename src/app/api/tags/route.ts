import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { db, tags } from "@/db";

const LOG_SOURCE = "tags-route";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const userTags = await db.query.tags.findMany({
      where: eq(tags.userId, userId),
      orderBy: [asc(tags.name)],
    });

    return NextResponse.json(userTags);
  } catch (error) {
    logger.error(
      "Error fetching tags:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const body = await request.json();
    logger.debug("Received tag creation request", { body }, LOG_SOURCE);

    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      logger.warn(
        "Tag validation failed",
        {
          hasBody: !!body,
          nameType: typeof body?.name,
          nameTrimmed: body?.name?.trim?.(),
        },
        LOG_SOURCE
      );
      return new NextResponse(
        JSON.stringify({
          error: "Name is required",
          details: {
            hasBody: !!body,
            nameType: typeof body?.name,
            receivedName: body?.name,
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const name = body.name.trim();
    const color = body.color;

    // Check if tag with same name already exists for this user
    const existingTag = await db.query.tags.findFirst({
      where: and(eq(tags.name, name), eq(tags.userId, userId)),
    });

    if (existingTag) {
      return new NextResponse(
        JSON.stringify({ error: "Tag with this name already exists" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const [newTag] = await db
      .insert(tags)
      .values({
        id: crypto.randomUUID(),
        name,
        color,
        userId,
      })
      .returning();

    return NextResponse.json(newTag);
  } catch (error) {
    logger.error(
      "Error creating tag:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
