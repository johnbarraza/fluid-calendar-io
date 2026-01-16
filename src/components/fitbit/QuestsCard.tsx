"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Target, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Quest {
    type: string;
    name: string;
    icon: string;
    target: number;
    current: number;
    completed: boolean;
    percentage: number;
    xp: number;
}

interface QuestsData {
    quests: Quest[];
    summary: {
        completed: number;
        total: number;
        xpToday: number;
        allCompleted: boolean;
    };
    stats: {
        totalXp: number;
        level: number;
        xpToNextLevel: number;
        currentStreak: number;
        longestStreak: number;
        totalQuestsCompleted: number;
    };
}

function formatQuestValue(type: string, value: number): string {
    switch (type) {
        case "SLEEP_HOURS":
            const hours = Math.floor(value / 60);
            const mins = value % 60;
            return `${hours}h ${mins}m`;
        case "STEPS":
            return value.toLocaleString();
        case "HEART_RATE":
            return value > 0 ? `${value} bpm` : "—";
        case "CALORIES":
            return value.toLocaleString();
        case "ACTIVE_MINUTES":
            return `${value} min`;
        default:
            return value.toString();
    }
}

function formatQuestTarget(type: string, target: number): string {
    switch (type) {
        case "SLEEP_HOURS":
            return `${Math.floor(target / 60)}h`;
        case "STEPS":
            return target.toLocaleString();
        case "HEART_RATE":
            return `≤${target} bpm`;
        case "CALORIES":
            return target.toLocaleString();
        case "ACTIVE_MINUTES":
            return `${target} min`;
        default:
            return target.toString();
    }
}

export function QuestsCard() {
    const [data, setData] = useState<QuestsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchQuests = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch("/api/fitbit/quests");

            if (!response.ok) {
                throw new Error("Failed to fetch quests");
            }

            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error loading quests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuests();
    }, []);

    if (loading) {
        return (
            <Card className="border-2 border-dashed border-muted-foreground/20">
                <CardContent className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card className="border-2 border-dashed border-red-500/20">
                <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
                    <p className="text-sm text-muted-foreground">{error || "No se pudieron cargar las quests"}</p>
                    <Button variant="outline" size="sm" onClick={fetchQuests}>
                        Reintentar
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const { quests, summary, stats } = data;

    return (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5 text-primary" />
                        Quests de Hoy
                    </CardTitle>
                    <div className="flex items-center gap-3">
                        {/* Streak Badge */}
                        {stats.currentStreak > 0 && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                                <Flame className="h-3 w-3 mr-1" />
                                {stats.currentStreak} días
                            </Badge>
                        )}
                        {/* Completion Badge */}
                        <Badge
                            variant={summary.allCompleted ? "default" : "outline"}
                            className={summary.allCompleted ? "bg-green-600" : ""}
                        >
                            {summary.completed}/{summary.total} ✓
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Quest List */}
                <div className="space-y-3">
                    {quests.map((quest) => (
                        <div
                            key={quest.type}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${quest.completed
                                ? "bg-green-50 dark:bg-green-950/30"
                                : "bg-muted/30"
                                }`}
                        >
                            <span className="text-xl">{quest.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-sm font-medium truncate">{quest.name}</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatQuestValue(quest.type, quest.current)} / {formatQuestTarget(quest.type, quest.target)}
                                    </span>
                                </div>
                                <Progress
                                    value={quest.percentage}
                                    className={`h-2 ${quest.completed ? "[&>div]:bg-green-500" : ""}`}
                                />
                            </div>
                            {quest.completed && (
                                <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 shrink-0">
                                    +{quest.xp} XP
                                </Badge>
                            )}
                        </div>
                    ))}
                </div>

                {/* Stats Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-muted">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">
                            Nivel <strong>{stats.level}</strong>
                        </span>
                        <span className="text-xs text-muted-foreground">
                            ({stats.xpToNextLevel} XP para subir)
                        </span>
                    </div>
                    {summary.xpToday > 0 && (
                        <Badge variant="secondary">
                            +{summary.xpToday} XP hoy
                        </Badge>
                    )}
                </div>

                {/* All Complete Celebration */}
                {summary.allCompleted && (
                    <div className="text-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg">
                        <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                            🎉 ¡Felicidades! Completaste todas las quests de hoy
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
