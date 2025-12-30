import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { HabitTrackingService } from "@/services/adhd/HabitTrackingService";

const LOG_SOURCE = "HabitsAPI";

// GET /api/adhd/habits - Get all active habits for user
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const habitService = new HabitTrackingService();
    const habits = await habitService.getActiveHabits(auth.userId);

    return NextResponse.json(habits);
  } catch (error) {
    logger.error(
      "Failed to fetch habits",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch habits" },
      { status: 500 }
    );
  }
}

// POST /api/adhd/habits - Create a new habit
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();

    const {
      name,
      description,
      icon,
      color,
      category,
      frequency,
      targetDaysPerWeek,
      customSchedule,
      reminderEnabled,
      reminderTime,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Habit name is required" },
        { status: 400 }
      );
    }

    const habitService = new HabitTrackingService();
    const habit = await habitService.createHabit(auth.userId, {
      name,
      description,
      icon,
      color,
      category,
      frequency,
      targetDaysPerWeek,
      customSchedule,
      reminderEnabled,
      reminderTime,
    });

    logger.info("Habit created", { habitId: habit.id }, LOG_SOURCE);

    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      "Failed to create habit",
      { error: errorMessage, stack: errorStack },
      LOG_SOURCE
    );
    console.error("[HabitsAPI] Create habit error:", errorMessage, errorStack);

    return NextResponse.json(
      {
        error: "Failed to create habit",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
