import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { PomodoroSession } from "@prisma/client"

const LOG_SOURCE = "PomodoroService"

export interface PomodoroConfig {
  workDuration?: number // minutes
  breakDuration?: number // minutes
  type?: "work" | "short_break" | "long_break"
}

export interface ProductivityStats {
  totalSessions: number
  completedSessions: number
  interruptedSessions: number
  totalFocusTime: number // minutes
  averageSessionLength: number // minutes
  completionRate: number // percentage
  sessionsPerDay: number
  mostProductiveHours: number[] // hours of day (0-23)
}

export class PomodoroService {
  /**
   * Start a new Pomodoro session
   */
  async startSession(
    userId: string,
    taskId?: string,
    config?: PomodoroConfig
  ): Promise<PomodoroSession> {
    logger.info("Starting Pomodoro session", { userId, taskId, config }, LOG_SOURCE)

    try {
      // Check if user already has an active session
      logger.info("Checking for active session", { userId }, LOG_SOURCE)
      const existingSession = await this.getActiveSession(userId)
      logger.info("Active session check result", { existingSession: existingSession?.id || null }, LOG_SOURCE)

      if (existingSession) {
        logger.warn(
          "User already has an active session",
          { userId, existingSessionId: existingSession.id },
          LOG_SOURCE
        )
        throw new Error(
          "You already have an active Pomodoro session. Please complete or interrupt it first."
        )
      }

      logger.info("Creating new session", {
        userId,
        taskId: taskId || null,
        workDuration: config?.workDuration || 25,
        breakDuration: config?.breakDuration || 5,
        type: config?.type || "work"
      }, LOG_SOURCE)

      const session = await prisma.pomodoroSession.create({
        data: {
          userId,
          taskId: taskId || null,
          workDuration: config?.workDuration || 25,
          breakDuration: config?.breakDuration || 5,
          type: config?.type || "work",
        },
      })

      logger.info(
        "Pomodoro session started successfully",
        { sessionId: session.id },
        LOG_SOURCE
      )

      return session
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      logger.error(
        "Failed to start Pomodoro session",
        { userId, error: errorMessage, stack: errorStack || "No stack trace" },
        LOG_SOURCE
      )
      console.error("[PomodoroService] Start session error:", errorMessage, errorStack)
      throw error
    }
  }

  /**
   * Complete a Pomodoro session
   */
  async completeSession(sessionId: string): Promise<PomodoroSession> {
    logger.info("Completing Pomodoro session", { sessionId }, LOG_SOURCE)

    try {
      const session = await prisma.pomodoroSession.findUnique({
        where: { id: sessionId },
        include: { task: true },
      })

      if (!session) {
        throw new Error(`Pomodoro session ${sessionId} not found`)
      }

      if (session.completed) {
        throw new Error("Session is already completed")
      }

      if (session.interrupted) {
        throw new Error("Session was interrupted and cannot be completed")
      }

      const updatedSession = await prisma.$transaction(async (tx) => {
        // Update session
        const updated = await tx.pomodoroSession.update({
          where: { id: sessionId },
          data: {
            completed: true,
            endedAt: new Date(),
          },
          include: { task: true },
        })

        // If this was a work session linked to a task, increment actualPomodoros
        if (updated.type === "work" && updated.taskId) {
          await tx.task.update({
            where: { id: updated.taskId },
            data: {
              actualPomodoros: {
                increment: 1,
              },
            },
          })
        }

        return updated
      })

      logger.info(
        "Pomodoro session completed successfully",
        { sessionId },
        LOG_SOURCE
      )

      return updatedSession
    } catch (error) {
      logger.error(
        "Failed to complete Pomodoro session",
        { sessionId, error: String(error) },
        LOG_SOURCE
      )
      throw error
    }
  }

  /**
   * Interrupt a Pomodoro session
   */
  async interruptSession(
    sessionId: string,
    reason: string
  ): Promise<PomodoroSession> {
    logger.info("Interrupting Pomodoro session", { sessionId, reason }, LOG_SOURCE)

    try {
      const session = await prisma.pomodoroSession.findUnique({
        where: { id: sessionId },
      })

      if (!session) {
        throw new Error(`Pomodoro session ${sessionId} not found`)
      }

      if (session.completed) {
        throw new Error("Cannot interrupt a completed session")
      }

      if (session.interrupted) {
        throw new Error("Session is already interrupted")
      }

      const updatedSession = await prisma.pomodoroSession.update({
        where: { id: sessionId },
        data: {
          interrupted: true,
          interruptReason: reason,
          endedAt: new Date(),
        },
      })

      logger.info(
        "Pomodoro session interrupted",
        { sessionId, reason },
        LOG_SOURCE
      )

      return updatedSession
    } catch (error) {
      logger.error(
        "Failed to interrupt Pomodoro session",
        { sessionId, error: String(error) },
        LOG_SOURCE
      )
      throw error
    }
  }

  /**
   * Get active (non-completed, non-interrupted) session for a user
   */
  async getActiveSession(userId: string): Promise<PomodoroSession | null> {
    logger.info("Fetching active Pomodoro session", { userId }, LOG_SOURCE)

    return prisma.pomodoroSession.findFirst({
      where: {
        userId,
        completed: false,
        interrupted: false,
      },
      orderBy: {
        startedAt: "desc",
      },
      include: {
        task: true,
      },
    })
  }

  /**
   * Get session history for a user
   */
  async getSessionHistory(
    userId: string,
    days: number = 7
  ): Promise<PomodoroSession[]> {
    logger.info(
      "Fetching Pomodoro session history",
      { userId, days },
      LOG_SOURCE
    )

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return prisma.pomodoroSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
        },
      },
      orderBy: {
        startedAt: "desc",
      },
      include: {
        task: true,
      },
    })
  }

  /**
   * Get productivity statistics for a user
   */
  async getProductivityStats(
    userId: string,
    days: number = 7
  ): Promise<ProductivityStats> {
    logger.info(
      "Calculating productivity stats",
      { userId, days },
      LOG_SOURCE
    )

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
        },
      },
    })

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        interruptedSessions: 0,
        totalFocusTime: 0,
        averageSessionLength: 0,
        completionRate: 0,
        sessionsPerDay: 0,
        mostProductiveHours: [],
      }
    }

    const completedSessions = sessions.filter((s) => s.completed)
    const interruptedSessions = sessions.filter((s) => s.interrupted)

    // Calculate total focus time
    const totalFocusTime = completedSessions.reduce((total, session) => {
      if (session.type === "work") {
        return total + session.workDuration
      }
      return total
    }, 0)

    // Calculate average session length for completed work sessions
    const completedWorkSessions = completedSessions.filter(
      (s) => s.type === "work"
    )
    const averageSessionLength =
      completedWorkSessions.length > 0
        ? totalFocusTime / completedWorkSessions.length
        : 0

    // Calculate completion rate
    const workSessions = sessions.filter((s) => s.type === "work")
    const completionRate =
      workSessions.length > 0
        ? (completedWorkSessions.length / workSessions.length) * 100
        : 0

    // Calculate sessions per day
    const sessionsPerDay = sessions.length / days

    // Find most productive hours (hours with most completed work sessions)
    const hourCounts: Record<number, number> = {}
    completedWorkSessions.forEach((session) => {
      const hour = session.startedAt.getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    const mostProductiveHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      interruptedSessions: interruptedSessions.length,
      totalFocusTime: Math.round(totalFocusTime),
      averageSessionLength: Math.round(averageSessionLength * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      sessionsPerDay: Math.round(sessionsPerDay * 10) / 10,
      mostProductiveHours,
    }
  }

  /**
   * Get sessions for a specific task
   */
  async getTaskSessions(taskId: string): Promise<PomodoroSession[]> {
    logger.info("Fetching sessions for task", { taskId }, LOG_SOURCE)

    return prisma.pomodoroSession.findMany({
      where: {
        taskId,
      },
      orderBy: {
        startedAt: "desc",
      },
    })
  }

  /**
   * Delete a session (admin/cleanup only)
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    logger.info("Deleting Pomodoro session", { sessionId, userId }, LOG_SOURCE)

    await prisma.pomodoroSession.delete({
      where: {
        id: sessionId,
        userId, // Ensure user owns this session
      },
    })
  }

  /**
   * Auto-interrupt stale sessions (sessions that have been running too long)
   * This should be run periodically via a cron job
   */
  async autoInterruptStaleSessions(): Promise<number> {
    logger.info("Auto-interrupting stale sessions", {}, LOG_SOURCE)

    const maxSessionDuration = 120 // 2 hours in minutes
    const cutoffTime = new Date()
    cutoffTime.setMinutes(cutoffTime.getMinutes() - maxSessionDuration)

    const staleSessions = await prisma.pomodoroSession.findMany({
      where: {
        completed: false,
        interrupted: false,
        startedAt: {
          lt: cutoffTime,
        },
      },
    })

    let count = 0
    for (const session of staleSessions) {
      await prisma.pomodoroSession.update({
        where: { id: session.id },
        data: {
          interrupted: true,
          interruptReason: "Auto-interrupted due to inactivity",
          endedAt: new Date(),
        },
      })
      count++
    }

    logger.info(
      `Auto-interrupted ${count} stale sessions`,
      { count },
      LOG_SOURCE
    )

    return count
  }
}
