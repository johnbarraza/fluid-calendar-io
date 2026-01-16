import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { db, fitbitUserQuests, fitbitUserStats, fitbitActivities, fitbitSleep, fitbitHeartRate } from "@/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitQuestsRoute";

// Quest definitions with targets
const QUEST_DEFINITIONS = [
    { type: "STEPS" as const, name: "Objetivo de Pasos", target: 10000, icon: "🚶", xp: 10 },
    { type: "SLEEP_HOURS" as const, name: "Buen Descanso", target: 420, icon: "😴", xp: 10 }, // 7 hours in minutes
    { type: "ACTIVE_MINUTES" as const, name: "Minutos Activos", target: 30, icon: "⏱️", xp: 10 },
    { type: "CALORIES" as const, name: "Quema Calorías", target: 2000, icon: "🔥", xp: 10 },
    { type: "HEART_RATE" as const, name: "Corazón Sano", target: 70, icon: "❤️", xp: 10 }, // Max resting HR
];

interface QuestProgress {
    type: string;
    name: string;
    icon: string;
    target: number;
    current: number;
    completed: boolean;
    percentage: number;
    xp: number;
}

/**
 * GET /api/fitbit/quests
 * Get today's quests and progress
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const auth = await authenticateRequest(request, LOG_SOURCE);
        if ("response" in auth && auth.response) {
            return auth.response;
        }

        const userId = auth.userId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's activity data
        const todayActivity = await db.query.fitbitActivities.findFirst({
            where: (table, { eq, gte, lte }) => and(
                eq(table.userId, userId),
                gte(table.date, today),
                lte(table.date, tomorrow)
            ),
            orderBy: (table, { desc }) => [desc(table.date)],
        });

        // Get today's sleep data - check today AND yesterday since sleep from last night 
        // may be recorded with yesterday's date
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todaySleep = await db.query.fitbitSleep.findFirst({
            where: (table, { eq, gte, lte }) => and(
                eq(table.userId, userId),
                gte(table.date, yesterday),
                lte(table.date, tomorrow)
            ),
            orderBy: (table, { desc }) => [desc(table.date)],
        });

        // Get today's heart rate
        const todayHR = await db.query.fitbitHeartRate.findFirst({
            where: (table, { eq, gte, lte }) => and(
                eq(table.userId, userId),
                gte(table.date, today),
                lte(table.date, tomorrow)
            ),
            orderBy: (table, { desc }) => [desc(table.date)],
        });

        // Get or create user stats
        let userStats = await db.query.fitbitUserStats.findFirst({
            where: (table, { eq }) => eq(table.userId, userId),
        });

        if (!userStats) {
            // Create first record
            await db.insert(fitbitUserStats).values({
                id: crypto.randomUUID(),
                userId,
                totalXp: 0,
                level: 1,
                currentStreak: 0,
                longestStreak: 0,
                totalQuestsCompleted: 0,
                totalAchievements: 0,
            });

            userStats = await db.query.fitbitUserStats.findFirst({
                where: (table, { eq }) => eq(table.userId, userId),
            });
        }

        // Calculate quest progress
        const quests: QuestProgress[] = QUEST_DEFINITIONS.map((quest) => {
            let current = 0;
            let completed = false;

            switch (quest.type) {
                case "STEPS":
                    current = todayActivity?.steps ?? 0;
                    completed = current >= quest.target;
                    break;
                case "SLEEP_HOURS":
                    current = todaySleep?.duration ?? 0;
                    completed = current >= quest.target;
                    break;
                case "ACTIVE_MINUTES":
                    current = todayActivity?.activeMinutes ??
                        ((todayActivity?.lightlyActiveMinutes ?? 0) +
                            (todayActivity?.fairlyActiveMinutes ?? 0) +
                            (todayActivity?.veryActiveMinutes ?? 0));
                    completed = current >= quest.target;
                    break;
                case "CALORIES":
                    current = todayActivity?.calories ?? 0;
                    completed = current >= quest.target;
                    break;
                case "HEART_RATE":
                    current = todayHR?.restingHeartRate ?? 0;
                    // For heart rate, lower is better, so completed if <= target
                    completed = current > 0 && current <= quest.target;
                    break;
            }

            const percentage = quest.type === "HEART_RATE"
                ? (current > 0 ? Math.min(100, (quest.target / current) * 100) : 0)
                : Math.min(100, (current / quest.target) * 100);

            return {
                type: quest.type,
                name: quest.name,
                icon: quest.icon,
                target: quest.target,
                current,
                completed,
                percentage: Math.round(percentage),
                xp: quest.xp,
            };
        });

        const completedCount = quests.filter(q => q.completed).length;
        const totalXpToday = quests.filter(q => q.completed).reduce((sum, q) => sum + q.xp, 0);
        const allCompleted = completedCount === quests.length && quests.length > 0;

        // Calculate level from XP (100 XP per level)
        const level = Math.floor((userStats?.totalXp ?? 0) / 100) + 1;
        const xpToNextLevel = 100 - ((userStats?.totalXp ?? 0) % 100);

        logger.info(
            "Quests retrieved",
            { userId, completedCount, totalQuests: quests.length },
            LOG_SOURCE
        );

        return NextResponse.json({
            quests,
            summary: {
                completed: completedCount,
                total: quests.length,
                xpToday: totalXpToday,
                allCompleted,
            },
            stats: {
                totalXp: userStats?.totalXp ?? 0,
                level,
                xpToNextLevel,
                currentStreak: userStats?.currentStreak ?? 0,
                longestStreak: userStats?.longestStreak ?? 0,
                totalQuestsCompleted: userStats?.totalQuestsCompleted ?? 0,
            },
        });
    } catch (error) {
        logger.error(
            "Failed to get quests",
            { error: error instanceof Error ? error.message : "Unknown" },
            LOG_SOURCE
        );

        return NextResponse.json(
            { error: "Failed to get quests" },
            { status: 500 }
        );
    }
}
