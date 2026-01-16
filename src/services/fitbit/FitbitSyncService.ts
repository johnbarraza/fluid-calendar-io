import { db, fitbitAccounts, fitbitActivities, fitbitSleep, fitbitHeartRate, fitbitHRV } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";

import { FitbitClient } from "@/lib/fitbit-client";
import { refreshFitbitTokens } from "@/lib/fitbit-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitSyncService";

/**
 * Service for synchronizing Fitbit data to local database
 */
export class FitbitSyncService {
  /**
   * Get authenticated Fitbit client for user
   */
  private async getFitbitClient(userId: string): Promise<FitbitClient> {
    const account = await db.query.fitbitAccounts.findFirst({
      where: (fitbitAccounts, { eq }) => eq(fitbitAccounts.userId, userId),
    });

    if (!account) {
      throw new Error("Fitbit account not connected");
    }

    // Check if token is expired
    const now = new Date();
    if (account.expiresAt <= now) {
      logger.info("Refreshing expired Fitbit token", { userId }, LOG_SOURCE);

      const newTokens = await refreshFitbitTokens(account.refreshToken);

      await db.update(fitbitAccounts)
        .set({
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
        })
        .where(eq(fitbitAccounts.userId, userId));

      return new FitbitClient(newTokens.access_token);
    }

    return new FitbitClient(account.accessToken);
  }

  /**
   * Sync daily activity data for a specific date
   */
  async syncDailyActivity(userId: string, date: Date): Promise<void> {
    try {
      const client = await this.getFitbitClient(userId);
      const dateStr = date.toISOString().split("T")[0];

      logger.info(
        "Syncing Fitbit daily activity",
        { userId, date: dateStr },
        LOG_SOURCE
      );

      const data = await client.getDailyActivity(dateStr);

      // Try to find existing activity record
      const activity = await db.query.fitbitActivities.findFirst({
        where: (activities, { eq, and }) =>
          and(
            eq(activities.userId, userId),
            eq(activities.date, date)
          ),
      });

      const activityData = {
        steps: data.summary.steps,
        distance: data.summary.distance,
        calories: data.summary.calories,
        activeMinutes: data.summary.activeScore || 0,
        floors: data.summary.floors,
        elevation: data.summary.elevation,
      };

      if (activity) {
        // Update existing record
        await db.update(fitbitActivities)
          .set({
            ...activityData,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(fitbitActivities.userId, userId),
              eq(fitbitActivities.date, date)
            )
          );
      } else {
        // Create new record
        await db.insert(fitbitActivities).values({
          id: crypto.randomUUID(),
          userId,
          date,
          ...activityData,
        });
      }

      logger.info(
        "Successfully synced Fitbit activity",
        { userId, date: dateStr, steps: data.summary.steps },
        LOG_SOURCE
      );
    } catch (error) {
      logger.error(
        "Failed to sync Fitbit activity",
        {
          userId,
          date: date.toISOString(),
          error: error instanceof Error ? error.message : "Unknown",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Sync sleep data for a specific date
   */
  async syncSleep(userId: string, startDate: Date): Promise<void> {
    try {
      const client = await this.getFitbitClient(userId);
      const dateStr = startDate.toISOString().split("T")[0];

      logger.info(
        "Syncing Fitbit sleep data",
        { userId, date: dateStr },
        LOG_SOURCE
      );

      const data = await client.getSleep(dateStr);

      // Fitbit can return multiple sleep sessions per day
      for (const sleepSession of data.sleep) {
        const sleepDate = new Date(sleepSession.dateOfSleep);

        // Try to find existing sleep record
        const existingSleep = await db.query.fitbitSleep.findFirst({
          where: (sleep, { eq, and }) =>
            and(
              eq(sleep.userId, userId),
              eq(sleep.date, sleepDate)
            ),
        });

        const sleepData = {
          startTime: new Date(sleepSession.startTime),
          endTime: new Date(sleepSession.endTime),
          duration: sleepSession.duration,
          efficiency: sleepSession.efficiency,
          minutesAsleep: sleepSession.minutesAsleep,
          minutesAwake: sleepSession.minutesAwake,
          timeInBed: sleepSession.timeInBed,
          deepSleep: sleepSession.levels?.summary?.deep?.minutes,
          lightSleep: sleepSession.levels?.summary?.light?.minutes,
          remSleep: sleepSession.levels?.summary?.rem?.minutes,
          awakeSleep: sleepSession.levels?.summary?.wake?.minutes,
        };

        if (existingSleep) {
          // Update existing record
          await db.update(fitbitSleep)
            .set({
              ...sleepData,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(fitbitSleep.userId, userId),
                eq(fitbitSleep.date, sleepDate)
              )
            );
        } else {
          // Create new record
          await db.insert(fitbitSleep).values({
            id: crypto.randomUUID(),
            userId,
            date: sleepDate,
            ...sleepData,
          });
        }
      }

      logger.info(
        "Successfully synced Fitbit sleep",
        { userId, date: dateStr, sessions: data.sleep.length },
        LOG_SOURCE
      );
    } catch (error) {
      logger.error(
        "Failed to sync Fitbit sleep",
        {
          userId,
          date: startDate.toISOString(),
          error: error instanceof Error ? error.message : "Unknown",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Sync sleep data for a date range (more efficient - single API call)
   * Max range: 100 days
   */
  async syncSleepRange(userId: string, startDate: Date, endDate: Date): Promise<void> {
    try {
      const client = await this.getFitbitClient(userId);
      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      logger.info(
        "Syncing Fitbit sleep data (range)",
        { userId, startDate: startStr, endDate: endStr },
        LOG_SOURCE
      );

      const data = await client.getSleepRange(startStr, endStr);

      // Process all sleep sessions from the range
      for (const sleepSession of data.sleep) {
        const sleepDate = new Date(sleepSession.dateOfSleep);

        // Try to find existing sleep record
        const existingSleep = await db.query.fitbitSleep.findFirst({
          where: (sleep, { eq, and }) =>
            and(
              eq(sleep.userId, userId),
              eq(sleep.date, sleepDate)
            ),
        });

        const sleepData = {
          startTime: new Date(sleepSession.startTime),
          endTime: new Date(sleepSession.endTime),
          duration: sleepSession.duration,
          efficiency: sleepSession.efficiency,
          minutesAsleep: sleepSession.minutesAsleep,
          minutesAwake: sleepSession.minutesAwake,
          timeInBed: sleepSession.timeInBed,
          deepSleep: sleepSession.levels?.summary?.deep?.minutes,
          lightSleep: sleepSession.levels?.summary?.light?.minutes,
          remSleep: sleepSession.levels?.summary?.rem?.minutes,
          awakeSleep: sleepSession.levels?.summary?.wake?.minutes,
        };

        if (existingSleep) {
          await db.update(fitbitSleep)
            .set({
              ...sleepData,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(fitbitSleep.userId, userId),
                eq(fitbitSleep.date, sleepDate)
              )
            );
        } else {
          await db.insert(fitbitSleep).values({
            id: crypto.randomUUID(),
            userId,
            date: sleepDate,
            ...sleepData,
          });
        }
      }

      logger.info(
        "Successfully synced Fitbit sleep range",
        { userId, startDate: startStr, endDate: endStr, sessions: data.sleep.length },
        LOG_SOURCE
      );
    } catch (error) {
      logger.error(
        "Failed to sync Fitbit sleep range",
        {
          userId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          error: error instanceof Error ? error.message : "Unknown",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Sync heart rate data for a specific date
   */
  async syncHeartRate(userId: string, date: Date): Promise<void> {
    try {
      const client = await this.getFitbitClient(userId);
      const dateStr = date.toISOString().split("T")[0];

      logger.info(
        "Syncing Fitbit heart rate",
        { userId, date: dateStr },
        LOG_SOURCE
      );

      const data = await client.getHeartRate(dateStr);

      if (data["activities-heart"].length === 0) {
        logger.warn(
          "No heart rate data available",
          { userId, date: dateStr },
          LOG_SOURCE
        );
        return;
      }

      const heartData = data["activities-heart"][0].value;
      const zones = heartData.heartRateZones || [];

      // Calculate average from intraday data if available
      let averageHeartRate: number | undefined;
      let maxHeartRate: number | undefined;
      let minHeartRate: number | undefined;

      if (data["activities-heart-intraday"]?.dataset) {
        const values = data["activities-heart-intraday"].dataset.map(
          (d) => d.value
        );
        if (values.length > 0) {
          averageHeartRate = Math.round(
            values.reduce((a, b) => a + b) / values.length
          );
          maxHeartRate = Math.max(...values);
          minHeartRate = Math.min(...values);
        }
      }

      // Try to find existing heart rate record
      const existingHeartRate = await db.query.fitbitHeartRate.findFirst({
        where: (hr, { eq, and }) =>
          and(
            eq(hr.userId, userId),
            eq(hr.date, date)
          ),
      });

      const heartRateData = {
        restingHeartRate: heartData.restingHeartRate,
        averageHeartRate,
        maxHeartRate,
        minHeartRate,
        zones,
      };

      if (existingHeartRate) {
        // Update existing record
        await db.update(fitbitHeartRate)
          .set({
            ...heartRateData,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(fitbitHeartRate.userId, userId),
              eq(fitbitHeartRate.date, date)
            )
          );
      } else {
        // Create new record
        await db.insert(fitbitHeartRate).values({
          id: crypto.randomUUID(),
          userId,
          date,
          ...heartRateData,
        });
      }

      logger.info(
        "Successfully synced Fitbit heart rate",
        {
          userId,
          date: dateStr,
          restingHR: heartData.restingHeartRate || null,
        },
        LOG_SOURCE
      );
    } catch (error) {
      logger.error(
        "Failed to sync Fitbit heart rate",
        {
          userId,
          date: date.toISOString(),
          error: error instanceof Error ? error.message : "Unknown",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Sync Heart Rate Variability (HRV) data for a specific date
   */
  async syncHRV(userId: string, date: Date): Promise<void> {
    try {
      const client = await this.getFitbitClient(userId);
      const dateStr = date.toISOString().split("T")[0];

      logger.info(
        "Syncing Fitbit HRV",
        { userId, date: dateStr },
        LOG_SOURCE
      );

      const data = await client.getHRV(dateStr);

      if (!data.hrv || data.hrv.length === 0) {
        logger.warn(
          "No HRV data available",
          { userId, date: dateStr },
          LOG_SOURCE
        );
        return;
      }

      const hrvData = data.hrv[0].value;

      // Try to find existing HRV record
      const existingHRV = await db.query.fitbitHRV.findFirst({
        where: (hrv, { eq, and }) =>
          and(
            eq(hrv.userId, userId),
            eq(hrv.date, date)
          ),
      });

      const hrvRecord = {
        dailyRmssd: hrvData.dailyRmssd,
        deepRmssd: hrvData.deepRmssd,
      };

      if (existingHRV) {
        // Update existing record
        await db.update(fitbitHRV)
          .set({
            ...hrvRecord,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(fitbitHRV.userId, userId),
              eq(fitbitHRV.date, date)
            )
          );
      } else {
        // Create new record
        await db.insert(fitbitHRV).values({
          id: crypto.randomUUID(),
          userId,
          date,
          ...hrvRecord,
        });
      }

      logger.info(
        "Successfully synced Fitbit HRV",
        {
          userId,
          date: dateStr,
          dailyRmssd: hrvData.dailyRmssd,
        },
        LOG_SOURCE
      );
    } catch (error) {
      // HRV may not be available for all users/dates, so just log and continue
      logger.warn(
        "Failed to sync Fitbit HRV (may not be available)",
        {
          userId,
          date: date.toISOString(),
          error: error instanceof Error ? error.message : "Unknown",
        },
        LOG_SOURCE
      );
      // Don't throw - HRV is optional and may not be available
    }
  }

  /**
   * Sync all data types for a date range
   */
  async syncAll(userId: string, startDate: Date, endDate: Date): Promise<void> {
    logger.info(
      "Starting full Fitbit sync",
      {
        userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      LOG_SOURCE
    );

    // Sync sleep data in bulk (single API call - more efficient)
    try {
      await this.syncSleepRange(userId, startDate, endDate);
    } catch (error) {
      logger.error(
        "Failed to sync sleep range, will try individual days",
        { userId, error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
    }

    const dates: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const date of dates) {
      try {
        await this.syncDailyActivity(userId, date);
        await this.syncHeartRate(userId, date);
        await this.syncHRV(userId, date);

        // Respect API rate limits (150 requests/hour = ~2.5/minute)
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (error) {
        logger.error(
          "Failed to sync date",
          {
            userId,
            date: date.toISOString(),
            error: error instanceof Error ? error.message : "Unknown",
          },
          LOG_SOURCE
        );
        // Continue with next date even if one fails
      }
    }

    logger.info(
      "Completed full Fitbit sync",
      { userId, datesProcessed: dates.length },
      LOG_SOURCE
    );
  }
}
