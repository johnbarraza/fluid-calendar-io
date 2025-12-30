import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { Task, AutoScheduleSettings } from "@prisma/client"

const LOG_SOURCE = "BreakProtectionService"

export interface BreakViolation {
  type: "insufficient_break" | "too_long_continuous" | "no_lunch_break"
  taskIds: string[]
  startTime: Date
  endTime: Date
  description: string
  severity: "low" | "medium" | "high"
  suggestedFix: string
}

export interface BreakSuggestion {
  type: "short_break" | "long_break" | "lunch"
  suggestedTime: Date
  duration: number // minutes
  reason: string
  priority: "low" | "medium" | "high"
}

export class BreakProtectionService {
  /**
   * Validate if a schedule respects break requirements
   */
  async validateScheduleBreaks(
    tasks: Task[],
    settings: AutoScheduleSettings
  ): Promise<BreakViolation[]> {
    logger.info("Validating schedule breaks", { taskCount: tasks.length }, LOG_SOURCE)

    const violations: BreakViolation[] = []

    // Filter only scheduled tasks and sort by start time
    const scheduledTasks = tasks
      .filter((t) => t.scheduledStart && t.scheduledEnd)
      .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime())

    if (scheduledTasks.length === 0) return violations

    // Check gaps between consecutive tasks
    for (let i = 0; i < scheduledTasks.length - 1; i++) {
      const currentTask = scheduledTasks[i]
      const nextTask = scheduledTasks[i + 1]

      const gapMinutes =
        (nextTask.scheduledStart!.getTime() - currentTask.scheduledEnd!.getTime()) /
        (1000 * 60)

      if (gapMinutes < settings.minBreakDuration && gapMinutes >= 0) {
        violations.push({
          type: "insufficient_break",
          taskIds: [currentTask.id, nextTask.id],
          startTime: currentTask.scheduledEnd!,
          endTime: nextTask.scheduledStart!,
          description: `Only ${Math.round(gapMinutes)} minutes between tasks (minimum: ${
            settings.minBreakDuration
          } minutes)`,
          severity: gapMinutes < 5 ? "high" : "medium",
          suggestedFix: `Add ${settings.minBreakDuration - Math.round(gapMinutes)} more minutes between tasks`,
        })
      }
    }

    // Check for continuous work periods exceeding maximum
    let workBlockStart: Task | null = null
    let workBlockTasks: Task[] = []
    let totalWorkMinutes = 0

    for (let i = 0; i < scheduledTasks.length; i++) {
      const currentTask = scheduledTasks[i]

      if (!workBlockStart) {
        workBlockStart = currentTask
        workBlockTasks = [currentTask]
        totalWorkMinutes = currentTask.duration || 60
      } else {
        const previousTask = scheduledTasks[i - 1]
        const gapMinutes =
          (currentTask.scheduledStart!.getTime() - previousTask.scheduledEnd!.getTime()) /
          (1000 * 60)

        if (gapMinutes < settings.minBreakDuration) {
          // Still in continuous work block
          workBlockTasks.push(currentTask)
          totalWorkMinutes += currentTask.duration || 60
        } else {
          // Break detected, check if previous block was too long
          if (totalWorkMinutes > settings.maxConsecutiveHours * 60) {
            violations.push({
              type: "too_long_continuous",
              taskIds: workBlockTasks.map((t) => t.id),
              startTime: workBlockStart.scheduledStart!,
              endTime: previousTask.scheduledEnd!,
              description: `Continuous work for ${Math.round(
                totalWorkMinutes / 60
              )} hours without adequate break (maximum: ${settings.maxConsecutiveHours} hours)`,
              severity:
                totalWorkMinutes > settings.maxConsecutiveHours * 60 * 1.5
                  ? "high"
                  : "medium",
              suggestedFix: `Add a ${settings.minBreakDuration}-minute break after ${settings.maxConsecutiveHours} hours of work`,
            })
          }

          // Start new work block
          workBlockStart = currentTask
          workBlockTasks = [currentTask]
          totalWorkMinutes = currentTask.duration || 60
        }
      }
    }

    // Check the last work block
    if (
      workBlockStart &&
      totalWorkMinutes > settings.maxConsecutiveHours * 60
    ) {
      const lastTask = workBlockTasks[workBlockTasks.length - 1]
      violations.push({
        type: "too_long_continuous",
        taskIds: workBlockTasks.map((t) => t.id),
        startTime: workBlockStart.scheduledStart!,
        endTime: lastTask.scheduledEnd!,
        description: `Continuous work for ${Math.round(
          totalWorkMinutes / 60
        )} hours without adequate break (maximum: ${settings.maxConsecutiveHours} hours)`,
        severity:
          totalWorkMinutes > settings.maxConsecutiveHours * 60 * 1.5
            ? "high"
            : "medium",
        suggestedFix: `Add a ${settings.minBreakDuration}-minute break after ${settings.maxConsecutiveHours} hours of work`,
      })
    }

    // Check for lunch break (11:30am - 1:30pm)
    const lunchTasks = scheduledTasks.filter((task) => {
      const hour = task.scheduledStart!.getHours()
      const minutes = task.scheduledStart!.getMinutes()
      const timeInMinutes = hour * 60 + minutes

      return timeInMinutes >= 11 * 60 + 30 && timeInMinutes <= 13 * 60 + 30
    })

    if (lunchTasks.length > 0) {
      // Check if there's a continuous block during lunch time
      let hasLunchBreak = false
      for (let i = 0; i < lunchTasks.length - 1; i++) {
        const gapMinutes =
          (lunchTasks[i + 1].scheduledStart!.getTime() -
            lunchTasks[i].scheduledEnd!.getTime()) /
          (1000 * 60)

        if (gapMinutes >= 30) {
          // Found lunch break
          hasLunchBreak = true
          break
        }
      }

      if (!hasLunchBreak && lunchTasks.length >= 2) {
        violations.push({
          type: "no_lunch_break",
          taskIds: lunchTasks.map((t) => t.id),
          startTime: lunchTasks[0].scheduledStart!,
          endTime: lunchTasks[lunchTasks.length - 1].scheduledEnd!,
          description: `No lunch break detected during typical lunch hours (11:30am-1:30pm)`,
          severity: "medium",
          suggestedFix: "Add a 30-60 minute lunch break between 12pm-1pm",
        })
      }
    }

    logger.info(
      `Found ${violations.length} break violations`,
      { violationCount: violations.length },
      LOG_SOURCE
    )

    return violations
  }

  /**
   * Suggest breaks for a user's schedule on a specific date
   */
  async suggestBreaks(
    userId: string,
    date: Date
  ): Promise<BreakSuggestion[]> {
    logger.info("Suggesting breaks", { userId, date }, LOG_SOURCE)

    const suggestions: BreakSuggestion[] = []

    // Get settings
    const settings = await prisma.autoScheduleSettings.findUnique({
      where: { userId },
    })

    if (!settings || !settings.enforceBreaks) {
      return suggestions
    }

    // Get tasks for the day
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        scheduledStart: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        scheduledStart: "asc",
      },
    })

    const violations = await this.validateScheduleBreaks(tasks, settings)

    // Create suggestions based on violations
    for (const violation of violations) {
      if (violation.type === "insufficient_break") {
        const breakTime = violation.startTime
        suggestions.push({
          type: "short_break",
          suggestedTime: breakTime,
          duration: settings.minBreakDuration,
          reason: violation.description,
          priority: violation.severity === "high" ? "high" : "medium",
        })
      } else if (violation.type === "too_long_continuous") {
        // Suggest break in the middle of the continuous work period
        const midpoint = new Date(
          (violation.startTime.getTime() + violation.endTime.getTime()) / 2
        )
        suggestions.push({
          type: "long_break",
          suggestedTime: midpoint,
          duration: settings.minBreakDuration * 2, // Longer break
          reason: violation.description,
          priority: violation.severity === "high" ? "high" : "medium",
        })
      } else if (violation.type === "no_lunch_break") {
        const lunchTime = new Date(violation.startTime)
        lunchTime.setHours(12, 0, 0, 0)
        suggestions.push({
          type: "lunch",
          suggestedTime: lunchTime,
          duration: 60,
          reason: violation.description,
          priority: "high",
        })
      }
    }

    // Sort by priority (high first) and then by time
    suggestions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === "high" ? -1 : 1
      }
      return a.suggestedTime.getTime() - b.suggestedTime.getTime()
    })

    return suggestions
  }

  /**
   * Enforce breaks in a schedule by adjusting task times
   * This modifies task start/end times to ensure breaks
   */
  async enforceBreaksInSchedule(
    tasks: Task[],
    settings: AutoScheduleSettings
  ): Promise<Task[]> {
    logger.info(
      "Enforcing breaks in schedule",
      { taskCount: tasks.length },
      LOG_SOURCE
    )

    if (!settings.enforceBreaks) {
      return tasks
    }

    // Sort tasks by scheduled start time
    const scheduledTasks = tasks
      .filter((t) => t.scheduledStart && t.scheduledEnd)
      .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime())

    if (scheduledTasks.length === 0) {
      return tasks
    }

    const adjustedTasks: Task[] = [...tasks]
    let cumulativeOffset = 0 // Track total time added by breaks
    let workBlockStart: Date | null = null
    let workBlockMinutes = 0

    for (let i = 0; i < scheduledTasks.length; i++) {
      const currentTask = scheduledTasks[i]
      const taskIndex = adjustedTasks.findIndex((t) => t.id === currentTask.id)

      // Apply cumulative offset from previous breaks
      if (cumulativeOffset > 0) {
        const newStart = new Date(
          currentTask.scheduledStart!.getTime() + cumulativeOffset
        )
        const newEnd = new Date(
          currentTask.scheduledEnd!.getTime() + cumulativeOffset
        )
        adjustedTasks[taskIndex] = {
          ...currentTask,
          scheduledStart: newStart,
          scheduledEnd: newEnd,
        }
      }

      // Track work block duration
      if (!workBlockStart) {
        workBlockStart = adjustedTasks[taskIndex].scheduledStart
        workBlockMinutes = currentTask.duration || 60
      } else {
        workBlockMinutes += currentTask.duration || 60
      }

      // Check if we need to insert a break after this task
      if (i < scheduledTasks.length - 1) {
        const nextTask = scheduledTasks[i + 1]
        const currentEnd = adjustedTasks[taskIndex].scheduledEnd!
        const nextStart = new Date(
          nextTask.scheduledStart!.getTime() + cumulativeOffset
        )

        const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60)

        // Check if we need to add a break
        let breakNeeded = false
        let breakDuration = 0

        // 1. Check for insufficient gap
        if (gapMinutes < settings.minBreakDuration && gapMinutes >= 0) {
          breakNeeded = true
          breakDuration = settings.minBreakDuration
        }

        // 2. Check for continuous work limit
        if (workBlockMinutes >= settings.maxConsecutiveHours * 60) {
          breakNeeded = true
          breakDuration = Math.max(
            breakDuration,
            settings.minBreakDuration * 2
          ) // Longer break
          workBlockStart = null
          workBlockMinutes = 0
        }

        if (breakNeeded) {
          const breakOffset = (breakDuration - gapMinutes) * 60 * 1000
          if (breakOffset > 0) {
            cumulativeOffset += breakOffset
          }
        }
      }
    }

    logger.info(
      `Enforced breaks, total offset: ${cumulativeOffset / (1000 * 60)} minutes`,
      { offsetMinutes: cumulativeOffset / (1000 * 60) },
      LOG_SOURCE
    )

    return adjustedTasks
  }

  /**
   * Check if a new task can be scheduled without violating breaks
   */
  async canScheduleWithoutViolation(
    newTask: Task,
    existingTasks: Task[],
    settings: AutoScheduleSettings
  ): Promise<boolean> {
    if (!settings.enforceBreaks) {
      return true
    }

    const allTasks = [...existingTasks, newTask]
    const violations = await this.validateScheduleBreaks(allTasks, settings)

    // Check if any violation involves the new task
    const newTaskViolations = violations.filter((v) =>
      v.taskIds.includes(newTask.id)
    )

    return newTaskViolations.length === 0
  }

  /**
   * Get break compliance score for a user (0-100)
   * Higher score means better compliance with break rules
   */
  async getBreakComplianceScore(
    userId: string,
    days: number = 7
  ): Promise<number> {
    logger.info(
      "Calculating break compliance score",
      { userId, days },
      LOG_SOURCE
    )

    const settings = await prisma.autoScheduleSettings.findUnique({
      where: { userId },
    })

    if (!settings || !settings.enforceBreaks) {
      return 100 // Perfect score if breaks not enforced
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        scheduledStart: {
          gte: startDate,
        },
      },
    })

    if (tasks.length === 0) {
      return 100
    }

    const violations = await this.validateScheduleBreaks(tasks, settings)

    // Calculate score based on violations
    const severityWeights = {
      low: 1,
      medium: 2,
      high: 3,
    }

    const totalPenalty = violations.reduce(
      (sum, v) => sum + severityWeights[v.severity],
      0
    )

    // Normalize score (assuming 1 violation per task is very bad)
    const maxPossiblePenalty = tasks.length * 3
    const score = Math.max(
      0,
      100 - (totalPenalty / maxPossiblePenalty) * 100
    )

    return Math.round(score)
  }
}
