import { db, calendarEvents, tasks, autoScheduleSettings, scheduleSuggestions } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";

import { logger } from "@/lib/logger"
import type { Task, ScheduleSuggestion, AutoScheduleSettings } from "@/db/types"

const LOG_SOURCE = "RescheduleSuggestionService"

export interface SuggestionReason {
  type: "conflict" | "deadline_proximity" | "energy_mismatch" | "overload" | "break_violation"
  reason: string
  confidence: number
  suggestedStart?: Date
  suggestedEnd?: Date
}

export class RescheduleSuggestionService {
  constructor() {
    // No dependencies needed
  }

  /**
   * Generate schedule suggestions for all user's tasks
   * This should be run daily via cron job
   */
  async generateSuggestions(userId: string): Promise<ScheduleSuggestion[]> {
    logger.info("Generating schedule suggestions", { userId }, LOG_SOURCE)

    try {
      // Get user settings, create default if not exists
      let settings = await db.query.autoScheduleSettings.findFirst({
        where: (autoScheduleSettings, { eq }) => eq(autoScheduleSettings.userId, userId),
      })

      if (!settings) {
        // Create default settings
        const [newSettings] = await db.insert(autoScheduleSettings).values({
          id: crypto.randomUUID(),
          userId,
          workDays: "[1,2,3,4,5]", // Monday-Friday
          workHourStart: 9,
          workHourEnd: 17,
          selectedCalendars: "[]",
          bufferMinutes: 15,
          enableSuggestions: true,
          enforceBreaks: true,
          minBreakDuration: 15,
          maxConsecutiveHours: 3,
          highEnergyStart: 9,
          highEnergyEnd: 12,
          mediumEnergyStart: 13,
          mediumEnergyEnd: 16,
          lowEnergyStart: 16,
          lowEnergyEnd: 18,
        }).returning();
        settings = newSettings;
        logger.info("Created default auto-schedule settings", { userId }, LOG_SOURCE)
      }

      if (!settings.enableSuggestions) {
        logger.info(
          "Suggestions disabled for user",
          { userId },
          LOG_SOURCE
        )
        return []
      }

      // Get all tasks that are scheduled or should be scheduled
      const tasks = await db.query.tasks.findMany({
        where: (tasks, { eq, and, not }) => and(
          eq(tasks.userId, userId),
          not(eq(tasks.status, "completed"))
        ),
      })

      // Get all calendar events for conflict detection
      const calendarIds = settings.selectedCalendars
        ? JSON.parse(settings.selectedCalendars)
        : []
      const calendarEvents = await this.getCalendarEvents(userId, calendarIds)

      const suggestions: ScheduleSuggestion[] = []

      // Check each task for potential issues
      for (const task of tasks) {
        const taskSuggestions = await this.evaluateTaskSchedule(
          task,
          userId,
          settings,
          tasks,
          calendarEvents
        )

        for (const suggestion of taskSuggestions) {
          // Only create suggestion if confidence is high enough
          if (suggestion.confidence >= 0.6) {
            suggestions.push(await this.createSuggestion(task, suggestion))
          }
        }
      }

      // Limit to 5 active suggestions per user
      const existingSuggestions = await db.select({ count: sql<number>`count(*)::int` })
        .from(scheduleSuggestions)
        .where(
          and(
            eq(scheduleSuggestions.userId, userId),
            eq(scheduleSuggestions.status, "pending")
          )
        );

      const suggestionLimit = 5 - (existingSuggestions[0]?.count || 0)
      const limitedSuggestions = suggestions.slice(0, Math.max(0, suggestionLimit))

      logger.info(
        `Generated ${limitedSuggestions.length} suggestions`,
        { userId },
        LOG_SOURCE
      )

      return limitedSuggestions
    } catch (error) {
      logger.error(
        "Failed to generate suggestions",
        { userId, error: String(error) },
        LOG_SOURCE
      )
      throw error
    }
  }

  /**
   * Evaluate a single task's schedule and return potential suggestions
   */
  async evaluateTaskSchedule(
    task: Task,
    _userId: string,
    settings: AutoScheduleSettings,
    allTasks: Task[],
    calendarEvents: Array<Record<string, unknown>>
  ): Promise<SuggestionReason[]> {
    const suggestions: SuggestionReason[] = []

    // 1. Conflict Detection
    if (task.scheduledStart && task.scheduledEnd) {
      const hasConflict = this.detectConflict(
        task.scheduledStart,
        task.scheduledEnd,
        calendarEvents,
        allTasks.filter((t) => t.id !== task.id)
      )

      if (hasConflict) {
        const alternativeSlot = await this.findAlternativeSlot(
          task,
          settings,
          allTasks,
          calendarEvents
        )

        if (alternativeSlot) {
          suggestions.push({
            type: "conflict",
            reason: `This task conflicts with another event. Suggested alternative time available.`,
            confidence: 1.0, // Conflicts are certain
            suggestedStart: alternativeSlot.start,
            suggestedEnd: alternativeSlot.end,
          })
        }
      }
    }

    // 2. Deadline Proximity
    if (task.dueDate) {
      const hoursUntilDue = this.getHoursUntilDue(task.dueDate)

      if (hoursUntilDue <= 24 && hoursUntilDue > 0 && !task.scheduledStart) {
        const urgentSlot = await this.findEarliestAvailableSlot(
          task,
          settings,
          allTasks,
          calendarEvents
        )

        if (urgentSlot) {
          suggestions.push({
            type: "deadline_proximity",
            reason: `This task is due in ${Math.round(hoursUntilDue)} hours and isn't scheduled. Schedule it soon!`,
            confidence: 0.9,
            suggestedStart: urgentSlot.start,
            suggestedEnd: urgentSlot.end,
          })
        }
      }
    }

    // 3. Energy Mismatch
    if (task.scheduledStart && task.energyLevel && settings) {
      const scheduledHour = task.scheduledStart.getHours()
      const expectedEnergyLevel = this.getExpectedEnergyLevel(
        scheduledHour,
        settings
      )

      if (expectedEnergyLevel && expectedEnergyLevel !== task.energyLevel) {
        const betterSlot = await this.findBetterEnergySlot(
          task,
          settings,
          allTasks,
          calendarEvents
        )

        if (betterSlot) {
          suggestions.push({
            type: "energy_mismatch",
            reason: `This ${task.energyLevel}-energy task is scheduled during ${expectedEnergyLevel}-energy time. Consider rescheduling.`,
            confidence: 0.7,
            suggestedStart: betterSlot.start,
            suggestedEnd: betterSlot.end,
          })
        }
      }
    }

    // 4. Overload Detection
    if (task.scheduledStart) {
      const dayStart = new Date(task.scheduledStart)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(task.scheduledStart)
      dayEnd.setHours(23, 59, 59, 999)

      const tasksOnSameDay = allTasks.filter(
        (t) =>
          t.scheduledStart &&
          t.scheduledStart >= dayStart &&
          t.scheduledStart <= dayEnd
      )

      const totalMinutes = tasksOnSameDay.reduce(
        (sum, t) => sum + (t.duration || 60),
        0
      )

      if (totalMinutes > 360) {
        // More than 6 hours scheduled
        suggestions.push({
          type: "overload",
          reason: `You have ${Math.round(
            totalMinutes / 60
          )} hours scheduled today. Consider spreading tasks across multiple days.`,
          confidence: 0.8,
        })
      }
    }

    // 5. Break Violation
    if (task.scheduledStart && task.scheduledEnd && settings.enforceBreaks) {
      const hasBreakViolation = this.detectBreakViolation(
        task,
        allTasks,
        settings
      )

      if (hasBreakViolation) {
        suggestions.push({
          type: "break_violation",
          reason: `This task is scheduled back-to-back with others for too long. Add breaks to prevent burnout.`,
          confidence: 0.85,
        })
      }
    }

    return suggestions
  }

  /**
   * Detect if a time slot conflicts with calendar events or other tasks
   */
  private detectConflict(
    start: Date,
    end: Date,
    calendarEvents: Array<Record<string, unknown>>,
    otherTasks: Task[]
  ): boolean {
    // Check calendar events
    for (const event of calendarEvents) {
      const eventStart = event.start instanceof Date ? event.start : new Date(String(event.start));
      const eventEnd = event.end instanceof Date ? event.end : new Date(String(event.end));
      if (this.timesOverlap(start, end, eventStart, eventEnd)) {
        return true
      }
    }

    // Check other scheduled tasks
    for (const task of otherTasks) {
      if (task.scheduledStart && task.scheduledEnd) {
        if (
          this.timesOverlap(start, end, task.scheduledStart, task.scheduledEnd)
        ) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check if two time ranges overlap
   */
  private timesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2
  }

  /**
   * Get hours until task is due
   */
  private getHoursUntilDue(dueDate: Date): number {
    const now = new Date()
    const diff = dueDate.getTime() - now.getTime()
    return diff / (1000 * 60 * 60)
  }

  /**
   * Get expected energy level for a given hour based on settings
   */
  private getExpectedEnergyLevel(
    hour: number,
    settings: AutoScheduleSettings
  ): string | null {
    if (
      settings.highEnergyStart !== null &&
      settings.highEnergyEnd !== null &&
      hour >= settings.highEnergyStart &&
      hour < settings.highEnergyEnd
    ) {
      return "high"
    }

    if (
      settings.mediumEnergyStart !== null &&
      settings.mediumEnergyEnd !== null &&
      hour >= settings.mediumEnergyStart &&
      hour < settings.mediumEnergyEnd
    ) {
      return "medium"
    }

    if (
      settings.lowEnergyStart !== null &&
      settings.lowEnergyEnd !== null &&
      hour >= settings.lowEnergyStart &&
      hour < settings.lowEnergyEnd
    ) {
      return "low"
    }

    return null
  }

  /**
   * Detect if a task violates break protection rules
   */
  private detectBreakViolation(
    task: Task,
    allTasks: Task[],
    settings: AutoScheduleSettings
  ): boolean {
    if (!task.scheduledStart || !task.scheduledEnd) return false

    // Find tasks immediately before and after
    const sortedTasks = allTasks
      .filter((t) => t.scheduledStart && t.id !== task.id)
      .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime())

    // Calculate continuous work duration including this task
    let continuousMinutes = task.duration || 60

    // Check tasks before
    for (let i = sortedTasks.length - 1; i >= 0; i--) {
      const prevTask = sortedTasks[i]
      if (!prevTask.scheduledStart || !prevTask.scheduledEnd) continue

      const gap =
        (task.scheduledStart.getTime() - prevTask.scheduledEnd.getTime()) /
        (1000 * 60)

      if (gap < settings.minBreakDuration) {
        continuousMinutes += prevTask.duration || 60
      } else {
        break
      }
    }

    // Check tasks after
    for (const nextTask of sortedTasks) {
      if (!nextTask.scheduledStart || !nextTask.scheduledEnd) continue

      if (nextTask.scheduledStart! > task.scheduledEnd!) {
        const gap =
          (nextTask.scheduledStart.getTime() - task.scheduledEnd.getTime()) /
          (1000 * 60)

        if (gap < settings.minBreakDuration) {
          continuousMinutes += nextTask.duration || 60
        } else {
          break
        }
      }
    }

    const continuousHours = continuousMinutes / 60
    return continuousHours > settings.maxConsecutiveHours
  }

  /**
   * Generate simple time slots for scheduling
   */
  private generateSimpleSlots(
    daysAhead: number,
    settings: AutoScheduleSettings,
    taskDuration: number
  ): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = []
    const now = new Date()

    for (let day = 0; day < daysAhead; day++) {
      const currentDay = new Date(now)
      currentDay.setDate(currentDay.getDate() + day)

      // Skip to start of work hours if it's today
      const startHour = day === 0 && now.getHours() >= settings.workHourStart
        ? now.getHours() + 1
        : settings.workHourStart

      // Generate slots during work hours at 30-minute intervals
      for (let hour = startHour; hour < settings.workHourEnd; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(currentDay)
          slotStart.setHours(hour, minute, 0, 0)

          const slotEnd = new Date(slotStart.getTime() + taskDuration * 60000)

          // Make sure slot doesn't extend past work hours
          if (slotEnd.getHours() < settings.workHourEnd ||
            (slotEnd.getHours() === settings.workHourEnd && slotEnd.getMinutes() === 0)) {
            slots.push({ start: slotStart, end: slotEnd })
          }
        }
      }
    }

    return slots
  }

  /**
   * Find alternative time slot for conflicted task
   */
  private async findAlternativeSlot(
    task: Task,
    settings: AutoScheduleSettings,
    allTasks: Task[],
    calendarEvents: Array<Record<string, unknown>>
  ): Promise<{ start: Date; end: Date } | null> {
    // Generate potential slots for next 7 days
    const slots = this.generateSimpleSlots(7, settings, task.duration || 60)

    // Find first available slot without conflicts
    for (const slot of slots) {
      if (!this.detectConflict(slot.start, slot.end, calendarEvents, allTasks)) {
        return slot
      }
    }

    return null
  }

  /**
   * Find earliest available slot for urgent task
   */
  private async findEarliestAvailableSlot(
    task: Task,
    settings: AutoScheduleSettings,
    allTasks: Task[],
    calendarEvents: Array<Record<string, unknown>>
  ): Promise<{ start: Date; end: Date } | null> {
    // Look ahead 3 days for urgent tasks
    const slots = this.generateSimpleSlots(3, settings, task.duration || 60)

    for (const slot of slots) {
      if (!this.detectConflict(slot.start, slot.end, calendarEvents, allTasks)) {
        return slot
      }
    }

    return null
  }

  /**
   * Find better time slot matching task's energy level
   */
  private async findBetterEnergySlot(
    task: Task,
    settings: AutoScheduleSettings,
    allTasks: Task[],
    calendarEvents: Array<Record<string, unknown>>
  ): Promise<{ start: Date; end: Date } | null> {
    // Generate slots for next 7 days
    const slots = this.generateSimpleSlots(7, settings, task.duration || 60)

    // Find first slot that matches energy level and has no conflicts
    for (const slot of slots) {
      const hour = slot.start.getHours()
      const expectedEnergy = this.getExpectedEnergyLevel(hour, settings)

      if (expectedEnergy === task.energyLevel &&
        !this.detectConflict(slot.start, slot.end, calendarEvents, allTasks)) {
        return slot
      }
    }

    return null
  }

  /**
   * Get calendar events for conflict detection
   */
  private async getCalendarEvents(
    _userId: string,
    calendarIds: string[]
  ): Promise<Array<Record<string, unknown>>> {
    if (calendarIds.length === 0) return []

    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)

    return db.query.calendarEvents.findMany({
      where: (calendarEvents, { inArray, and, gte, lte }) => and(
        inArray(calendarEvents.feedId, calendarIds),
        gte(calendarEvents.start, now),
        lte(calendarEvents.start, futureDate)
      ),
    })
  }

  /**
   * Create a suggestion record in database
   */
  private async createSuggestion(
    task: Task,
    suggestion: SuggestionReason
  ): Promise<ScheduleSuggestion> {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Expire after 24 hours

    const [newSuggestion] = await db.insert(scheduleSuggestions).values({
      id: crypto.randomUUID(),
      userId: task.userId!,
      taskId: task.id,
      suggestionType: suggestion.type,
      reason: suggestion.reason,
      confidence: suggestion.confidence,
      currentStart: task.scheduledStart,
      currentEnd: task.scheduledEnd,
      suggestedStart: suggestion.suggestedStart,
      suggestedEnd: suggestion.suggestedEnd,
      expiresAt,
    }).returning();

    return newSuggestion;
  }

  /**
   * Accept a suggestion and update the task
   */
  async acceptSuggestion(
    suggestionId: string,
    userId: string
  ): Promise<Task> {
    logger.info("Accepting suggestion", { suggestionId, userId }, LOG_SOURCE)

    try {
      const suggestion = await db.query.scheduleSuggestions.findFirst({
        where: (table, { eq }) => eq(table.id, suggestionId),
        with: { task: true },
      });

      if (!suggestion || suggestion.userId !== userId) {
        throw new Error("Suggestion not found or unauthorized")
      }

      if (suggestion.status !== "pending") {
        throw new Error("Suggestion has already been responded to")
      }

      // Update task with suggested times
      const updatedTask = await db.transaction(async (tx) => {
        await tx.update(scheduleSuggestions)
          .set({
            status: "accepted",
            respondedAt: new Date(),
          })
          .where(eq(scheduleSuggestions.id, suggestionId));

        await tx.update(tasks)
          .set({
            scheduledStart: suggestion.suggestedStart,
            scheduledEnd: suggestion.suggestedEnd,
            isAutoScheduled: true,
          })
          .where(eq(tasks.id, suggestion.taskId));

        const foundTask = await tx.query.tasks.findFirst({
          where: (table, { eq }) => eq(table.id, suggestion.taskId),
        });

        if (!foundTask) {
          throw new Error("Task not found after suggestion acceptance");
        }
        return foundTask;
      });

      logger.info("Suggestion accepted", { suggestionId }, LOG_SOURCE)
      return updatedTask
    } catch (error) {
      logger.error(
        "Failed to accept suggestion",
        { suggestionId, error: String(error) },
        LOG_SOURCE
      )
      throw error
    }
  }

  /**
   * Reject a suggestion
   */
  async rejectSuggestion(suggestionId: string, userId: string): Promise<void> {
    logger.info("Rejecting suggestion", { suggestionId, userId }, LOG_SOURCE)

    const suggestion = await db.query.scheduleSuggestions.findFirst({
      where: (table, { eq }) => eq(table.id, suggestionId),
    });

    if (!suggestion || suggestion.userId !== userId) {
      throw new Error("Suggestion not found or unauthorized")
    }

    await db.update(scheduleSuggestions)
      .set({
        status: "rejected",
        respondedAt: new Date(),
      })
      .where(eq(scheduleSuggestions.id, suggestionId));
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string, userId: string): Promise<void> {
    logger.info("Dismissing suggestion", { suggestionId, userId }, LOG_SOURCE)

    const suggestion = await db.query.scheduleSuggestions.findFirst({
      where: (table, { eq }) => eq(table.id, suggestionId),
    });

    if (!suggestion || suggestion.userId !== userId) {
      throw new Error("Suggestion not found or unauthorized")
    }

    await db.update(scheduleSuggestions)
      .set({
        status: "dismissed",
        respondedAt: new Date(),
      })
      .where(eq(scheduleSuggestions.id, suggestionId));
  }

  /**
   * Get suggestions for a user by status
   */
  async getSuggestions(
    userId: string,
    status: "pending" | "accepted" | "rejected"
  ): Promise<ScheduleSuggestion[]> {
    return db.query.scheduleSuggestions.findMany({
      where: (scheduleSuggestions, { eq, and, gt }) => {
        const conditions = [
          eq(scheduleSuggestions.userId, userId),
          eq(scheduleSuggestions.status, status)
        ];

        // Only filter by expiration for pending suggestions
        if (status === "pending") {
          conditions.push(gt(scheduleSuggestions.expiresAt, new Date()));
        }

        return and(...conditions);
      },
      with: {
        task: true,
      },
      orderBy: (table, { desc }) => [desc(table.confidence)],
      limit: status === "pending" ? 5 : 20,
    })
  }

  /**
   * Get pending suggestions for a user
   */
  async getPendingSuggestions(userId: string): Promise<ScheduleSuggestion[]> {
    return this.getSuggestions(userId, "pending")
  }

  /**
   * Cleanup expired suggestions
   * Should be run daily via cron job
   */
  async cleanupExpiredSuggestions(): Promise<number> {
    logger.info("Cleaning up expired suggestions", {}, LOG_SOURCE)

    await db.update(scheduleSuggestions)
      .set({ status: "dismissed" })
      .where(and(
        eq(scheduleSuggestions.status, "pending"),
        lte(scheduleSuggestions.expiresAt, new Date())
      ));

    const countResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(scheduleSuggestions)
      .where(and(
        eq(scheduleSuggestions.status, "dismissed"),
        lte(scheduleSuggestions.expiresAt, new Date())
      ));

    const count = countResult[0]?.count || 0;
    logger.info(`Cleaned up ${count} expired suggestions`, {}, LOG_SOURCE)
    return count
  }
}
