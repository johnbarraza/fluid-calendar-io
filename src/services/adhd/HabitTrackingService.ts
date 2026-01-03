import { logger } from "@/lib/logger"
import type { Habit, HabitLog, HabitWithLogs } from "@/db/types";
import { db, habits, habitLogs } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";

const LOG_SOURCE = "HabitTrackingService"

export interface HabitStats {
  completionRate: number // 0-100%
  averagePerWeek: number
  consistencyScore: number // 0-100% based on variance
  totalDays: number
  missedDays: number
}

export interface MoodEntryInput {
  mood: string
  energyLevel: string
  focus?: number
  anxiety?: number
  note?: string
  tags?: string[]
}

export class HabitTrackingService {
  /**
   * Log a habit completion for a specific date
   */
  async logHabitCompletion(
    habitId: string,
    userId: string,
    note?: string,
    mood?: string
  ): Promise<HabitLog> {
    logger.info("Logging habit completion", { habitId, userId }, LOG_SOURCE)

    // Get today's date at midnight (for consistent date comparison)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      // Create the habit log entry
      const [habitLog] = await db.insert(habitLogs).values({
        id: crypto.randomUUID(),
        habitId,
        date: today,
        note,
        mood,
      }).returning();

      // Recalculate and update the streak
      const habit = await db.query.habits.findFirst({
        where: (table, { eq }) => eq(table.id, habitId),
        with: {
          logs: {
            orderBy: (logs, { desc }) => [desc(logs.date)],
            limit: 365, // Look back 1 year max
          },
        },
      });

      if (!habit) {
        throw new Error(`Habit ${habitId} not found`)
      }

      const currentStreak = this.calculateCurrentStreak(habit)
      const longestStreak = Math.max(currentStreak, habit.longestStreak)

      // Update habit with new streak and total completions
      await db.update(habits)
        .set({
          currentStreak,
          longestStreak,
          totalCompletions: habit.totalCompletions + 1,
        })
        .where(eq(habits.id, habitId));

      const result = habitLog;

      logger.info("Habit completion logged successfully", { habitId }, LOG_SOURCE)
      return result
    } catch (error) {
      logger.error(
        "Failed to log habit completion",
        { habitId, error: String(error) },
        LOG_SOURCE
      )
      throw error
    }
  }

  /**
   * Calculate current streak for a habit
   */
  calculateCurrentStreak(habit: HabitWithLogs): number {
    if (habit.logs.length === 0) {
      return 0
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Sort logs by date descending (most recent first)
    const sortedLogs = [...habit.logs].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    )

    let streak = 0
    const currentDate = new Date(today)

    // Determine frequency requirements
    const { frequency, targetDaysPerWeek } = habit
    const isDailyHabit = frequency === "daily"
    const isWeeklyHabit = frequency === "weekly"

    if (isDailyHabit) {
      // For daily habits, check consecutive days
      for (const log of sortedLogs) {
        const logDate = new Date(log.date)
        logDate.setHours(0, 0, 0, 0)

        // Check if this log matches the expected date
        if (logDate.getTime() === currentDate.getTime()) {
          streak++
          // Move to previous day
          currentDate.setDate(currentDate.getDate() - 1)
        } else {
          // Gap found, break streak
          break
        }
      }
    } else if (isWeeklyHabit && targetDaysPerWeek) {
      // For weekly habits, count completions per week
      const weeksToCheck = 52 // Check up to 1 year
      let consecutiveWeeksMet = 0

      for (let weekOffset = 0; weekOffset < weeksToCheck; weekOffset++) {
        const weekStart = new Date(today)
        weekStart.setDate(weekStart.getDate() - weekOffset * 7)
        weekStart.setHours(0, 0, 0, 0)

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        // Count completions in this week
        const weekCompletions = sortedLogs.filter((log) => {
          const logDate = new Date(log.date)
          return logDate >= weekStart && logDate <= weekEnd
        }).length

        if (weekCompletions >= targetDaysPerWeek) {
          consecutiveWeeksMet++
        } else {
          // Week target not met, break streak
          break
        }
      }

      streak = consecutiveWeeksMet
    }

    return streak
  }

  /**
   * Calculate habit statistics for a given timeframe
   */
  async getHabitStats(
    habitId: string,
    timeframe: "week" | "month" | "year" = "month"
  ): Promise<HabitStats> {
    logger.info("Fetching habit stats", { habitId, timeframe }, LOG_SOURCE)

    const habit = await db.query.habits.findFirst({
      where: (table, { eq }) => eq(table.id, habitId),
      with: {
        logs: {
          orderBy: (logs, { desc }) => [desc(logs.date)],
        },
      },
    })

    if (!habit) {
      throw new Error(`Habit ${habitId} not found`)
    }

    // Determine date range
    const now = new Date()
    const startDate = new Date()

    switch (timeframe) {
      case "week":
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate.setDate(now.getDate() - 30)
        break
      case "year":
        startDate.setDate(now.getDate() - 365)
        break
    }

    // Filter logs within timeframe
    const logsInTimeframe = habit.logs.filter((log) => log.date >= startDate)

    // Calculate total expected days
    const totalDays = Math.ceil(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Calculate completion rate
    let expectedCompletions = totalDays
    if (habit.frequency === "weekly" && habit.targetDaysPerWeek) {
      const weeks = Math.ceil(totalDays / 7)
      expectedCompletions = weeks * habit.targetDaysPerWeek
    }

    const actualCompletions = logsInTimeframe.length
    const completionRate = expectedCompletions > 0
      ? Math.min((actualCompletions / expectedCompletions) * 100, 100)
      : 0

    // Calculate average per week
    const weeks = totalDays / 7
    const averagePerWeek = weeks > 0 ? actualCompletions / weeks : 0

    // Calculate consistency score (inverse of variance)
    // Group by week and calculate variance
    const weeklyCompletions: number[] = []
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(weekStart.getDate() + i * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const weekCount = logsInTimeframe.filter(
        (log) => log.date >= weekStart && log.date < weekEnd
      ).length

      weeklyCompletions.push(weekCount)
    }

    const mean = averagePerWeek
    const variance =
      weeklyCompletions.length > 0
        ? weeklyCompletions.reduce(
          (sum, count) => sum + Math.pow(count - mean, 2),
          0
        ) / weeklyCompletions.length
        : 0

    // Consistency score: higher is better (lower variance)
    const maxVariance = mean * mean // Maximum possible variance
    const consistencyScore = maxVariance > 0
      ? Math.max(0, (1 - variance / maxVariance) * 100)
      : 100

    const missedDays = expectedCompletions - actualCompletions

    return {
      completionRate: Math.round(completionRate * 10) / 10,
      averagePerWeek: Math.round(averagePerWeek * 10) / 10,
      consistencyScore: Math.round(consistencyScore * 10) / 10,
      totalDays,
      missedDays: Math.max(0, missedDays),
    }
  }

  /**
   * Get a specific habit by ID for a user
   */
  async getHabitById(habitId: string, userId: string): Promise<Habit | null> {
    logger.info("Fetching habit", { habitId, userId }, LOG_SOURCE)

    const habit = await db.query.habits.findFirst({
      where: (habits, { eq, and }) => and(
        eq(habits.id, habitId),
        eq(habits.userId, userId)
      ),
    })
    return habit || null
  }

  /**
   * Get all active habits for a user
   */
  async getActiveHabits(userId: string): Promise<Habit[]> {
    logger.info("Fetching active habits", { userId }, LOG_SOURCE)

    return db.query.habits.findMany({
      where: (habits, { eq, and }) => and(
        eq(habits.userId, userId),
        eq(habits.isActive, true)
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    })
  }

  /**
   * Check for expired streaks (habits that should have been completed but weren't)
   * This should be run daily via a cron job
   */
  async checkStreakExpiration(userId: string): Promise<void> {
    logger.info("Checking for expired streaks", { userId }, LOG_SOURCE)

    const activeHabits = await db.query.habits.findMany({
      where: (habits, { eq, and, gt }) => and(
        eq(habits.userId, userId),
        eq(habits.isActive, true),
        gt(habits.currentStreak, 0) // Only check habits with active streaks
      ),
      with: {
        logs: {
          orderBy: (logs, { desc }) => [desc(logs.date)],
          limit: 10, // Get recent logs
        },
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const habit of activeHabits) {
      const recalculatedStreak = this.calculateCurrentStreak(habit as unknown as HabitWithLogs)

      // If recalculated streak is different, update it
      if (recalculatedStreak !== habit.currentStreak) {
        await db.update(habits)
          .set({ currentStreak: recalculatedStreak })
          .where(eq(habits.id, habit.id));

        logger.info(
          "Streak updated",
          {
            habitId: habit.id,
            oldStreak: habit.currentStreak,
            newStreak: recalculatedStreak,
          },
          LOG_SOURCE
        )
      }
    }
  }

  /**
   * Create a new habit
   */
  async createHabit(
    userId: string,
    data: {
      name: string
      description?: string
      icon?: string
      color?: string
      category?: string
      frequency?: string
      targetDaysPerWeek?: number
      customSchedule?: Record<string, boolean>
      reminderEnabled?: boolean
      reminderTime?: string
    }
  ): Promise<Habit> {
    logger.info("Creating habit", { userId, name: data.name }, LOG_SOURCE)

    const [habit] = await db.insert(habits).values({
      id: crypto.randomUUID(),
      userId,
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      category: data.category,
      frequency: data.frequency || "daily",
      targetDaysPerWeek: data.targetDaysPerWeek || 7,
      customSchedule: data.customSchedule
        ? JSON.stringify(data.customSchedule)
        : null,
      reminderEnabled: data.reminderEnabled || false,
      reminderTime: data.reminderTime,
    }).returning();

    return habit;
  }

  /**
   * Update a habit
   */
  async updateHabit(
    habitId: string,
    userId: string,
    data: Partial<{
      name: string
      description: string
      icon: string
      color: string
      category: string
      frequency: string
      targetDaysPerWeek: number
      customSchedule: Record<string, boolean>
      reminderEnabled: boolean
      reminderTime: string
      isActive: boolean
    }>
  ): Promise<Habit> {
    logger.info("Updating habit", { habitId, userId }, LOG_SOURCE)

    // Prepare custom schedule if provided
    const updateData: Record<string, unknown> = { ...data }
    if (data.customSchedule) {
      updateData.customSchedule = JSON.stringify(data.customSchedule)
    }

    await db.update(habits)
      .set(updateData)
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));

    const updatedHabit = await db.query.habits.findFirst({
      where: (table, { eq }) => eq(table.id, habitId),
    });

    if (!updatedHabit) {
      throw new Error(`Habit ${habitId} not found after update`);
    }

    return updatedHabit;
  }

  /**
   * Delete a habit
   */
  async deleteHabit(habitId: string, userId: string): Promise<void> {
    logger.info("Deleting habit", { habitId, userId }, LOG_SOURCE)

    await db.delete(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  }

  /**
   * Get habit logs for a specific date range
   */
  async getHabitLogs(
    habitId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HabitLog[]> {
    logger.info(
      "Fetching habit logs",
      { habitId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      LOG_SOURCE
    )

    return db.query.habitLogs.findMany({
      where: (habitLogs, { eq, and, gte, lte }) => and(
        eq(habitLogs.habitId, habitId),
        gte(habitLogs.date, startDate),
        lte(habitLogs.date, endDate)
      ),
      orderBy: (table, { desc }) => [desc(table.date)],
    })
  }
}
