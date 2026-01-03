import { db, routines, routineCompletions } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";

import { logger } from "@/lib/logger";
import { RoutineCompletion } from "@prisma/client";

const LOG_SOURCE = "RoutineTrackingService";

export interface StartRoutineInput {
  routineId: string;
}

export interface UpdateRoutineProgressInput {
  currentTaskIndex: number;
  currentTaskStatus?: string;
  completedTasks: number;
}

export interface CompleteRoutineInput {
  notes?: string;
}

export class RoutineTrackingService {
  /**
   * Start a new routine session
   */
  async startRoutine(
    userId: string,
    input: StartRoutineInput
  ): Promise<RoutineCompletion> {
    try {
      // Get routine with tasks to calculate total duration
      const routine = await db.query.routines.findFirst({
        where: { id: input.routineId, userId },
        with: { tasks: true },
      });

      if (!routine) {
        throw new Error("Routine not found or access denied");
      }

      const totalDuration = routine.tasks.reduce(
        (sum, task) => sum + task.duration,
        0
      );

      // Check if there's already an in-progress session for this routine
      const existingSession = await db.query.routineCompletions.findFirst({
        where: {
          userId,
          routineId: input.routineId,
          status: "in_progress",
        },
      });

      if (existingSession) {
        logger.info(
          "Resuming existing routine session",
          { sessionId: existingSession.id },
          LOG_SOURCE
        );
        return existingSession;
      }

      // Create new session
      const [session] = await db.insert(routineCompletions).values({
        id: crypto.randomUUID(),
        userId,
        routineId: input.routineId,
        status: "in_progress",
        completedTasks: 0,
        totalTasks: routine.tasks.length,
        totalDuration,
        currentTaskIndex: 0,
        currentTaskStatus: "active",
      }).returning();

      logger.info(
        "Started routine session",
        { sessionId: session.id, routineId: input.routineId },
        LOG_SOURCE
      );

      return session;
    } catch (error) {
      logger.error(
        "Failed to start routine",
        { error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Update routine progress (move to next task, mark task complete, etc.)
   */
  async updateRoutineProgress(
    userId: string,
    sessionId: string,
    input: UpdateRoutineProgressInput
  ): Promise<RoutineCompletion> {
    try {
      // Verify ownership
      const existing = await db.query.routineCompletions.findFirst({
        where: { id: sessionId, userId },
      });

      if (!existing) {
        throw new Error("Session not found or access denied");
      }

      const session = await prisma.routineCompletion.update({
        where: { id: sessionId },
        data: {
          currentTaskIndex: input.currentTaskIndex,
          currentTaskStatus: input.currentTaskStatus,
          completedTasks: input.completedTasks,
        },
      });

      logger.info(
        "Updated routine progress",
        {
          sessionId,
          currentTaskIndex: input.currentTaskIndex,
          completedTasks: input.completedTasks,
        },
        LOG_SOURCE
      );

      return session;
    } catch (error) {
      logger.error(
        "Failed to update routine progress",
        { sessionId, error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Complete a routine session
   */
  async completeRoutine(
    userId: string,
    sessionId: string,
    input: CompleteRoutineInput
  ): Promise<RoutineCompletion> {
    try {
      const existing = await db.query.routineCompletions.findFirst({
        where: { id: sessionId, userId },
      });

      if (!existing) {
        throw new Error("Session not found or access denied");
      }

      const now = new Date();
      const actualDuration = Math.floor(
        (now.getTime() - existing.startedAt.getTime()) / (1000 * 60)
      );

      const session = await prisma.routineCompletion.update({
        where: { id: sessionId },
        data: {
          status: "completed",
          completedAt: now,
          actualDuration,
          completedTasks: existing.totalTasks,
          notes: input.notes,
        },
      });

      logger.info(
        "Completed routine session",
        { sessionId, actualDuration },
        LOG_SOURCE
      );

      return session;
    } catch (error) {
      logger.error(
        "Failed to complete routine",
        { sessionId, error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Abandon a routine session
   */
  async abandonRoutine(
    userId: string,
    sessionId: string,
    reason?: string
  ): Promise<RoutineCompletion> {
    try {
      const existing = await db.query.routineCompletions.findFirst({
        where: { id: sessionId, userId },
      });

      if (!existing) {
        throw new Error("Session not found or access denied");
      }

      const now = new Date();
      const actualDuration = Math.floor(
        (now.getTime() - existing.startedAt.getTime()) / (1000 * 60)
      );

      const session = await prisma.routineCompletion.update({
        where: { id: sessionId },
        data: {
          status: "abandoned",
          completedAt: now,
          actualDuration,
          notes: reason,
        },
      });

      logger.info("Abandoned routine session", { sessionId }, LOG_SOURCE);

      return session;
    } catch (error) {
      logger.error(
        "Failed to abandon routine",
        { sessionId, error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Get active session for a routine
   */
  async getActiveSession(
    userId: string,
    routineId: string
  ): Promise<RoutineCompletion | null> {
    try {
      const session = await db.query.routineCompletions.findFirst({
        where: {
          userId,
          routineId,
          status: "in_progress",
        },
        orderBy: { startedAt: "desc" },
      });

      return session;
    } catch (error) {
      logger.error(
        "Failed to get active session",
        { routineId, error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Get recent completions for a routine
   */
  async getRecentCompletions(
    userId: string,
    routineId: string,
    limit: number = 10
  ): Promise<RoutineCompletion[]> {
    try {
      const completions = await db.query.routineCompletions.findMany({
        where: {
          userId,
          routineId,
          status: { in: ["completed", "abandoned"] },
        },
        orderBy: { startedAt: "desc" },
        take: limit,
      });

      return completions;
    } catch (error) {
      logger.error(
        "Failed to get recent completions",
        { routineId, error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Get routine statistics
   */
  async getRoutineStats(userId: string, routineId: string) {
    try {
      const completions = await db.query.routineCompletions.findMany({
        where: {
          userId,
          routineId,
          status: "completed",
        },
      });

      if (completions.length === 0) {
        return {
          totalCompletions: 0,
          averageDuration: 0,
          completionRate: 0,
          currentStreak: 0,
          longestStreak: 0,
        };
      }

      const totalCompletions = completions.length;
      const averageDuration =
        completions.reduce((sum, c) => sum + (c.actualDuration || 0), 0) /
        totalCompletions;

      // Calculate completion rate (completed vs all sessions)
      const allSessionsResult = await db.select({ count: sql<number>`count(*)::int` })
        .from(routineCompletions)
        .where(
          and(
            eq(routineCompletions.userId, userId),
            eq(routineCompletions.routineId, routineId)
          )
        );
      const allSessions = allSessionsResult[0]?.count || 0;
      const completionRate = allSessions > 0 ? (totalCompletions / allSessions) * 100 : 0;

      // Calculate streaks
      const sortedCompletions = completions.sort(
        (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
      );

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastDate: Date | null = null;

      for (const completion of sortedCompletions) {
        const completionDate = new Date(completion.startedAt);
        completionDate.setHours(0, 0, 0, 0);

        if (!lastDate) {
          tempStreak = 1;
          currentStreak = 1;
        } else {
          const dayDiff = Math.floor(
            (lastDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (dayDiff === 1) {
            tempStreak++;
            currentStreak = tempStreak;
          } else if (dayDiff > 1) {
            currentStreak = 0;
            tempStreak = 1;
          }
        }

        longestStreak = Math.max(longestStreak, tempStreak);
        lastDate = completionDate;
      }

      return {
        totalCompletions,
        averageDuration: Math.round(averageDuration),
        completionRate: Math.round(completionRate),
        currentStreak,
        longestStreak,
      };
    } catch (error) {
      logger.error(
        "Failed to get routine stats",
        { routineId, error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      throw error;
    }
  }
}
