import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { Task, ScheduleSuggestion, AutoScheduleSettings } from "@prisma/client"

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
      let settings = await prisma.autoScheduleSettings.findUnique({
        where: { userId },
      })

      if (!settings) {
        // Create default settings
        settings = await prisma.autoScheduleSettings.create({
          data: {
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
          },
        })
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
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          status: {
            not: "completed",
          },
        },
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
      const existingSuggestions = await prisma.scheduleSuggestion.count({
        where: {
          userId,
          status: "pending",
        },
      })

      const suggestionLimit = 5 - existingSuggestions
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
    userId: string,
    settings: AutoScheduleSettings,
    allTasks: Task[],
    calendarEvents: any[]
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
    calendarEvents: any[],
    otherTasks: Task[]
  ): boolean {
    // Check calendar events
    for (const event of calendarEvents) {
      if (this.timesOverlap(start, end, event.start, event.end)) {
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
    calendarEvents: any[]
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
    calendarEvents: any[]
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
    calendarEvents: any[]
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
    userId: string,
    calendarIds: string[]
  ): Promise<any[]> {
    if (calendarIds.length === 0) return []

    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)

    return prisma.calendarEvent.findMany({
      where: {
        feedId: {
          in: calendarIds,
        },
        start: {
          gte: now,
          lte: futureDate,
        },
      },
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

    return prisma.scheduleSuggestion.create({
      data: {
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
      },
    })
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
      const suggestion = await prisma.scheduleSuggestion.findUnique({
        where: { id: suggestionId },
        include: { task: true },
      })

      if (!suggestion || suggestion.userId !== userId) {
        throw new Error("Suggestion not found or unauthorized")
      }

      if (suggestion.status !== "pending") {
        throw new Error("Suggestion has already been responded to")
      }

      // Update task with suggested times
      const updatedTask = await prisma.$transaction(async (tx) => {
        await tx.scheduleSuggestion.update({
          where: { id: suggestionId },
          data: {
            status: "accepted",
            respondedAt: new Date(),
          },
        })

        return tx.task.update({
          where: { id: suggestion.taskId },
          data: {
            scheduledStart: suggestion.suggestedStart,
            scheduledEnd: suggestion.suggestedEnd,
            isAutoScheduled: true,
          },
        })
      })

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

    const suggestion = await prisma.scheduleSuggestion.findUnique({
      where: { id: suggestionId },
    })

    if (!suggestion || suggestion.userId !== userId) {
      throw new Error("Suggestion not found or unauthorized")
    }

    await prisma.scheduleSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: "rejected",
        respondedAt: new Date(),
      },
    })
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string, userId: string): Promise<void> {
    logger.info("Dismissing suggestion", { suggestionId, userId }, LOG_SOURCE)

    const suggestion = await prisma.scheduleSuggestion.findUnique({
      where: { id: suggestionId },
    })

    if (!suggestion || suggestion.userId !== userId) {
      throw new Error("Suggestion not found or unauthorized")
    }

    await prisma.scheduleSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: "dismissed",
        respondedAt: new Date(),
      },
    })
  }

  /**
   * Get suggestions for a user by status
   */
  async getSuggestions(
    userId: string,
    status: "pending" | "accepted" | "rejected"
  ): Promise<ScheduleSuggestion[]> {
    const where: any = {
      userId,
      status,
    }

    // Only filter by expiration for pending suggestions
    if (status === "pending") {
      where.expiresAt = {
        gt: new Date(),
      }
    }

    return prisma.scheduleSuggestion.findMany({
      where,
      include: {
        task: true,
      },
      orderBy: {
        confidence: "desc",
      },
      take: status === "pending" ? 5 : 20,
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

    const result = await prisma.scheduleSuggestion.updateMany({
      where: {
        status: "pending",
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: "dismissed",
      },
    })

    logger.info(`Cleaned up ${result.count} expired suggestions`, {}, LOG_SOURCE)
    return result.count
  }
}
