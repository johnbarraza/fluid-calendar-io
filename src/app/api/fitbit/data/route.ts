import { db, fitbitAccounts, fitbitActivities, fitbitSleep, fitbitHeartRate } from "@/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitDataAPI";

type DataType = "activity" | "sleep" | "heartrate" | "all";

interface FitbitDataResponse {
    connected: boolean;
    activity?: Array<{
        date: string;
        steps: number;
        distance: number;
        calories: number;
        activeMinutes: number;
        floors: number;
    }>;
    sleep?: Array<{
        date: string;
        duration: number;
        minutesAsleep: number;
        minutesAwake: number;
        efficiency: number | null;
        sleepStages: unknown;
        startTime: string;
        endTime: string;
    }>;
    heartRate?: Array<{
        date: string;
        restingHeartRate: number | null;
        heartRateZones: unknown;
    }>;
    summary?: {
        today: {
            steps: number;
            sleepHours: number;
            restingHR: number | null;
        };
        averages: {
            steps: number;
            sleepHours: number;
            restingHR: number | null;
        };
    };
}

/**
 * GET /api/fitbit/data
 * Retrieves historical Fitbit data for the authenticated user
 * 
 * Query params:
 * - type: "activity" | "sleep" | "heartrate" | "all" (default: "all")
 * - days: number of days to fetch (default: 7, max: 90)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const auth = await authenticateRequest(request, LOG_SOURCE);
        if ("response" in auth && auth.response) {
            return auth.response;
        }

        const userId = auth.userId;
        const searchParams = request.nextUrl.searchParams;
        const type = (searchParams.get("type") || "all") as DataType;
        const days = Math.min(parseInt(searchParams.get("days") || "7", 10), 365);

        // Check if user has Fitbit connected
        const account = await db.query.fitbitAccounts.findFirst({
            where: (table, { eq }) => eq(table.userId, userId),
        });

        if (!account) {
            return NextResponse.json({
                connected: false,
                message: "No Fitbit account connected",
            });
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const response: FitbitDataResponse = { connected: true };

        // Fetch activity data
        if (type === "activity" || type === "all") {
            const activities = await db.query.fitbitActivities.findMany({
                where: (table, { eq, and, gte, lte }) =>
                    and(
                        eq(table.userId, userId),
                        gte(table.date, startDate),
                        lte(table.date, endDate)
                    ),
                orderBy: (table, { desc }) => [desc(table.date)],
            });

            // Deduplicate by date - keep only the first (most recent) record per date
            const activityByDate = new Map<string, typeof activities[0]>();
            activities.forEach((a) => {
                const dateKey = a.date.toISOString().split("T")[0];
                if (!activityByDate.has(dateKey)) {
                    activityByDate.set(dateKey, a);
                }
            });

            response.activity = Array.from(activityByDate.values()).map((a) => ({
                date: a.date.toISOString().split("T")[0],
                steps: a.steps ?? 0,
                distance: a.distance ?? 0,
                calories: a.calories ?? 0,
                activeMinutes: (a.lightlyActiveMinutes ?? 0) + (a.fairlyActiveMinutes ?? 0) + (a.veryActiveMinutes ?? 0),
                floors: a.floors ?? 0,
            }));
        }

        // Fetch sleep data
        if (type === "sleep" || type === "all") {
            const sleepData = await db.query.fitbitSleep.findMany({
                where: (table, { eq, and, gte, lte }) =>
                    and(
                        eq(table.userId, userId),
                        gte(table.date, startDate),
                        lte(table.date, endDate)
                    ),
                orderBy: (table, { desc }) => [desc(table.date)],
            });

            // Deduplicate by date - keep only the first (most recent) record per date
            const sleepByDate = new Map<string, typeof sleepData[0]>();
            sleepData.forEach((s) => {
                const dateKey = s.date.toISOString().split("T")[0];
                if (!sleepByDate.has(dateKey)) {
                    sleepByDate.set(dateKey, s);
                }
            });

            response.sleep = Array.from(sleepByDate.values()).map((s) => ({
                date: s.date.toISOString().split("T")[0],
                duration: s.duration,
                minutesAsleep: s.minutesAsleep,
                minutesAwake: s.minutesAwake,
                efficiency: s.efficiency,
                sleepStages: s.sleepStages,
                startTime: s.startTime.toISOString(),
                endTime: s.endTime.toISOString(),
            }));
        }

        // Fetch heart rate data
        if (type === "heartrate" || type === "all") {
            const hrData = await db.query.fitbitHeartRate.findMany({
                where: (table, { eq, and, gte, lte }) =>
                    and(
                        eq(table.userId, userId),
                        gte(table.date, startDate),
                        lte(table.date, endDate)
                    ),
                orderBy: (table, { desc }) => [desc(table.date)],
            });

            // Deduplicate by date - keep only the first (most recent) record per date
            const hrByDate = new Map<string, typeof hrData[0]>();
            hrData.forEach((hr) => {
                const dateKey = hr.date.toISOString().split("T")[0];
                if (!hrByDate.has(dateKey)) {
                    hrByDate.set(dateKey, hr);
                }
            });

            response.heartRate = Array.from(hrByDate.values()).map((hr) => ({
                date: hr.date.toISOString().split("T")[0],
                restingHeartRate: hr.restingHeartRate,
                heartRateZones: hr.heartRateZones,
            }));
        }

        // Calculate summary if fetching all data
        if (type === "all") {
            const today = new Date().toISOString().split("T")[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

            const todayActivity = response.activity?.find((a) => a.date === today);
            // Sleep from last night may be recorded with yesterday's date
            const todaySleep = response.sleep?.find((s) => s.date === today)
                ?? response.sleep?.find((s) => s.date === yesterday);
            const todayHR = response.heartRate?.find((hr) => hr.date === today);

            const avgSteps = response.activity?.length
                ? Math.round(response.activity.reduce((sum, a) => sum + a.steps, 0) / response.activity.length)
                : 0;

            const avgSleep = response.sleep?.length
                ? Math.round(response.sleep.reduce((sum, s) => sum + s.duration, 0) / response.sleep.length / 60 * 10) / 10
                : 0;

            const hrWithData = response.heartRate?.filter((hr) => hr.restingHeartRate !== null) ?? [];
            const avgHR = hrWithData.length
                ? Math.round(hrWithData.reduce((sum, hr) => sum + (hr.restingHeartRate ?? 0), 0) / hrWithData.length)
                : null;

            response.summary = {
                today: {
                    steps: todayActivity?.steps ?? 0,
                    sleepHours: todaySleep ? Math.round(todaySleep.duration / 60 * 10) / 10 : 0,
                    restingHR: todayHR?.restingHeartRate ?? null,
                },
                averages: {
                    steps: avgSteps,
                    sleepHours: avgSleep,
                    restingHR: avgHR,
                },
            };
        }

        logger.info(
            "Fitbit data retrieved",
            {
                userId,
                type,
                days,
                activityCount: response.activity?.length ?? 0,
                sleepCount: response.sleep?.length ?? 0,
                heartRateCount: response.heartRate?.length ?? 0,
            },
            LOG_SOURCE
        );

        return NextResponse.json(response);
    } catch (error) {
        logger.error(
            "Failed to retrieve Fitbit data",
            { error: error instanceof Error ? error.message : "Unknown error" },
            LOG_SOURCE
        );

        return NextResponse.json(
            { error: "Failed to retrieve Fitbit data" },
            { status: 500 }
        );
    }
}
