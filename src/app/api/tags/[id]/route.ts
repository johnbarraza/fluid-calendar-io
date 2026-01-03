import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { db, tags } from "@/db";

const LOG_SOURCE = "tag-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const tag = await db.query.tags.findFirst({
      where: and(eq(tags.id, id), eq(tags.userId, userId)),
    });

    if (!tag) {
      return new NextResponse("Tag not found", { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    logger.error(
      "Error fetching tag:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const tag = await db.query.tags.findFirst({
      where: and(eq(tags.id, id), eq(tags.userId, userId)),
    });

    if (!tag) {
      return new NextResponse("Tag not found", { status: 404 });
    }

    const json = await request.json();
    const { name, color } = json;

    // Check if another tag with the same name exists for this user
    if (name && name !== tag.name) {
      const existingTag = await db.query.tags.findFirst({
        where: and(
          eq(tags.name, name),
          ne(tags.id, id),
          eq(tags.userId, userId)
        ),
      });

      if (existingTag) {
        return new NextResponse("Tag with this name already exists", {
          status: 400,
        });
      }
    }

    const [updatedTag] = await db
      .update(tags)
      .set({
        ...(name && { name }),
        ...(color && { color }),
      })
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .returning();

    return NextResponse.json(updatedTag);
  } catch (error) {
    logger.error(
      "Error updating tag:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const tag = await db.query.tags.findFirst({
      where: and(eq(tags.id, id), eq(tags.userId, userId)),
    });

    if (!tag) {
      return new NextResponse("Tag not found", { status: 404 });
    }

    await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error(
      "Error deleting tag:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
