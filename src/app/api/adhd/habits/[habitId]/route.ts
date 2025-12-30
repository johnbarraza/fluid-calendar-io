import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { HabitTrackingService } from "@/services/adhd/HabitTrackingService";

const LOG_SOURCE = "HabitAPI";

// GET /api/adhd/habits/[habitId] - Get habit details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { habitId } = await params;
    const habitService = new HabitTrackingService();
    const habit = await habitService.getHabitById(habitId, auth.userId);

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    return NextResponse.json(habit);
  } catch (error) {
    logger.error(
      "Failed to fetch habit",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch habit" },
      { status: 500 }
    );
  }
}

// PATCH /api/adhd/habits/[habitId] - Update habit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { habitId } = await params;
    const body = await request.json();

    const habitService = new HabitTrackingService();
    const habit = await habitService.updateHabit(habitId, auth.userId, body);

    logger.info("Habit updated", { habitId }, LOG_SOURCE);

    return NextResponse.json(habit);
  } catch (error) {
    logger.error(
      "Failed to update habit",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update habit" },
      { status: 500 }
    );
  }
}

// DELETE /api/adhd/habits/[habitId] - Delete habit (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { habitId } = await params;
    const habitService = new HabitTrackingService();
    await habitService.deleteHabit(habitId, auth.userId);

    logger.info("Habit deleted", { habitId }, LOG_SOURCE);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to delete habit",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to delete habit" },
      { status: 500 }
    );
  }
}
