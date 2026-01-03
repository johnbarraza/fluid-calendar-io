import { db, fitbitActivities, fitbitSleep, fitbitHeartRate } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";

import { FitbitSyncService } from "@/services/fitbit/FitbitSyncService";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitTools";

// Zod Schemas for validation
export const GetActivitySchema = z.object({
  date: z.string().describe("Date in YYYY-MM-DD format"),
});

export const GetSleepSchema = z.object({
  startDate: z.string().describe("Start date in YYYY-MM-DD format"),
  endDate: z.string().describe("End date in YYYY-MM-DD format"),
});

export const GetHeartRateSchema = z.object({
  date: z.string().describe("Date in YYYY-MM-DD format"),
});

export const GetRecentActivitySchema = z.object({
  days: z.number().optional().default(7).describe("Number of days to retrieve (default: 7)"),
});

/**
 * Get Fitbit activity data for a specific date
 */
export async function getActivity(
  userId: string,
  params: z.infer<typeof GetActivitySchema>
) {
  try {
    const date = new Date(params.date);
    date.setHours(0, 0, 0, 0);

    // Try to get from database first
    let activity = await prisma.fitbitActivity.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });

    // If not found, sync from Fitbit
    if (!activity) {
      logger.info(
        "Activity not in DB, syncing from Fitbit",
        { userId, date: params.date },
        LOG_SOURCE
      );

      const syncService = new FitbitSyncService();
      await syncService.syncDailyActivity(userId, date);

      activity = await prisma.fitbitActivity.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      });
    }

    if (!activity) {
      return {
        error: "No activity data available for this date",
        date: params.date,
      };
    }

    return {
      date: params.date,
      steps: activity.steps,
      distance: activity.distance,
      calories: activity.calories,
      activeMinutes: activity.activeMinutes,
      floors: activity.floors,
      elevation: activity.elevation,
    };
  } catch (error) {
    logger.error(
      "Failed to get Fitbit activity",
      { userId, date: params.date, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return {
      error: "Failed to retrieve activity data",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get Fitbit sleep data for a date range
 */
export async function getSleep(
  userId: string,
  params: z.infer<typeof GetSleepSchema>
) {
  try {
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    let sleepData = await db.query.fitbitSleep.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // If no data, try to sync
    if (sleepData.length === 0) {
      logger.info(
        "Sleep data not in DB, syncing from Fitbit",
        { userId, startDate: params.startDate, endDate: params.endDate },
        LOG_SOURCE
      );

      const syncService = new FitbitSyncService();
      await syncService.syncSleep(userId, startDate);

      sleepData = await db.query.fitbitSleep.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: "asc",
        },
      });
    }

    return {
      startDate: params.startDate,
      endDate: params.endDate,
      count: sleepData.length,
      sleepSessions: sleepData.map((sleep) => ({
        date: sleep.date.toISOString().split("T")[0],
        startTime: sleep.startTime.toISOString(),
        endTime: sleep.endTime.toISOString(),
        duration: sleep.duration,
        efficiency: sleep.efficiency,
        minutesAsleep: sleep.minutesAsleep,
        minutesAwake: sleep.minutesAwake,
        timeInBed: sleep.timeInBed,
        deepSleep: sleep.deepSleep,
        lightSleep: sleep.lightSleep,
        remSleep: sleep.remSleep,
      })),
    };
  } catch (error) {
    logger.error(
      "Failed to get Fitbit sleep",
      {
        userId,
        startDate: params.startDate,
        endDate: params.endDate,
        error: error instanceof Error ? error.message : "Unknown",
      },
      LOG_SOURCE
    );

    return {
      error: "Failed to retrieve sleep data",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get Fitbit heart rate data for a specific date
 */
export async function getHeartRate(
  userId: string,
  params: z.infer<typeof GetHeartRateSchema>
) {
  try {
    const date = new Date(params.date);
    date.setHours(0, 0, 0, 0);

    let heartRate = await prisma.fitbitHeartRate.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });

    // If not found, sync from Fitbit
    if (!heartRate) {
      logger.info(
        "Heart rate not in DB, syncing from Fitbit",
        { userId, date: params.date },
        LOG_SOURCE
      );

      const syncService = new FitbitSyncService();
      await syncService.syncHeartRate(userId, date);

      heartRate = await prisma.fitbitHeartRate.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      });
    }

    if (!heartRate) {
      return {
        error: "No heart rate data available for this date",
        date: params.date,
      };
    }

    return {
      date: params.date,
      restingHeartRate: heartRate.restingHeartRate,
      averageHeartRate: heartRate.averageHeartRate,
      maxHeartRate: heartRate.maxHeartRate,
      minHeartRate: heartRate.minHeartRate,
      zones: heartRate.zones,
    };
  } catch (error) {
    logger.error(
      "Failed to get Fitbit heart rate",
      { userId, date: params.date, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return {
      error: "Failed to retrieve heart rate data",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get recent Fitbit activity summary
 */
export async function getRecentActivity(
  userId: string,
  params: z.infer<typeof GetRecentActivitySchema>
) {
  try {
    const days = params.days || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    const activities = await db.query.fitbitActivities.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Calculate totals and averages
    const totalSteps = activities.reduce((sum, a) => sum + a.steps, 0);
    const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
    const totalCalories = activities.reduce((sum, a) => sum + a.calories, 0);
    const avgSteps = activities.length > 0 ? Math.round(totalSteps / activities.length) : 0;

    return {
      period: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        days,
      },
      summary: {
        totalSteps,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalCalories,
        averageSteps: avgSteps,
        daysWithData: activities.length,
      },
      dailyActivity: activities.map((activity) => ({
        date: activity.date.toISOString().split("T")[0],
        steps: activity.steps,
        distance: activity.distance,
        calories: activity.calories,
        activeMinutes: activity.activeMinutes,
      })),
    };
  } catch (error) {
    logger.error(
      "Failed to get recent Fitbit activity",
      { userId, days: params.days, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return {
      error: "Failed to retrieve recent activity",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
