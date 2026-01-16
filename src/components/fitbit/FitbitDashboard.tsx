"use client";

import { useState, useEffect } from "react";
import { Activity, Moon, Heart, RefreshCw, Settings, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { logger } from "@/lib/logger/client-safe";
import { ActivityView } from "./ActivityView";
import { SleepView } from "./SleepView";
import { HeartRateView } from "./HeartRateView";
import { StatsCard } from "./StatsCard";
import { DateRangePicker } from "./DateRangePicker";
import { QuestsCard } from "./QuestsCard";

const LOG_SOURCE = "FitbitDashboard";

interface FitbitData {
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

export function FitbitDashboard() {
    const [data, setData] = useState<FitbitData | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [days, setDays] = useState(7);
    const [activeTab, setActiveTab] = useState("activity");

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/fitbit/data?days=${days}`);

            if (response.ok) {
                const result = await response.json();
                setData(result);
            } else {
                logger.error("Failed to fetch Fitbit data", {}, LOG_SOURCE);
                setData({ connected: false });
            }
        } catch (error) {
            logger.error(
                "Error fetching Fitbit data",
                { error: error instanceof Error ? error.message : "Unknown" },
                LOG_SOURCE
            );
            setData({ connected: false });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [days]);

    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await fetch("/api/fitbit/sync", { method: "POST" });

            if (response.ok) {
                await fetchData();
            }
        } catch (error) {
            logger.error("Sync failed", { error: error instanceof Error ? error.message : "Unknown" }, LOG_SOURCE);
        } finally {
            setSyncing(false);
        }
    };

    const getTrend = (today: number, average: number): "up" | "down" | "neutral" => {
        if (today > average * 1.1) return "up";
        if (today < average * 0.9) return "down";
        return "neutral";
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Fitbit</h1>
                        <p className="text-muted-foreground">Tu actividad y salud</p>
                    </div>
                </div>
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (!data?.connected) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Fitbit</h1>
                        <p className="text-muted-foreground">Tu actividad y salud</p>
                    </div>
                </div>

                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
                        <div className="flex gap-4 text-muted-foreground">
                            <Activity className="h-12 w-12" />
                            <Moon className="h-12 w-12" />
                            <Heart className="h-12 w-12" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold">Conecta tu Fitbit</h3>
                            <p className="text-muted-foreground max-w-md">
                                Visualiza tu actividad física, patrones de sueño y frecuencia cardíaca
                                conectando tu dispositivo Fitbit.
                            </p>
                        </div>
                        <Button asChild size="lg">
                            <Link href="/settings#fitbit">
                                <Settings className="mr-2 h-4 w-4" />
                                Ir a Configuración
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const summary = data.summary;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fitbit</h1>
                    <p className="text-muted-foreground">Tu actividad y salud</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker value={days} onChange={setDays} />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">Sincronizar</span>
                    </Button>
                </div>
            </div>

            {/* Quests Card */}
            <QuestsCard />

            {/* Summary Cards */}
            {summary && (
                <div className="grid gap-4 md:grid-cols-3">
                    <StatsCard
                        title="Pasos Hoy"
                        value={summary.today.steps.toLocaleString()}
                        icon={<Activity className="h-5 w-5" />}
                        trend={getTrend(summary.today.steps, summary.averages.steps)}
                        subtitle={`Promedio: ${summary.averages.steps.toLocaleString()}`}
                        color="blue"
                    />
                    <StatsCard
                        title="Horas de Sueño"
                        value={summary.today.sleepHours > 0 ? `${summary.today.sleepHours}h` : "—"}
                        icon={<Moon className="h-5 w-5" />}
                        trend={summary.today.sleepHours > 0 ? getTrend(summary.today.sleepHours, summary.averages.sleepHours) : "neutral"}
                        subtitle={`Promedio: ${summary.averages.sleepHours}h`}
                        color="purple"
                    />
                    <StatsCard
                        title="FC en Reposo"
                        value={summary.today.restingHR ? `${summary.today.restingHR} bpm` : "—"}
                        icon={<Heart className="h-5 w-5" />}
                        trend={summary.today.restingHR && summary.averages.restingHR
                            ? getTrend(summary.averages.restingHR, summary.today.restingHR) // Lower is better
                            : "neutral"}
                        subtitle={summary.averages.restingHR ? `Promedio: ${summary.averages.restingHR} bpm` : "Sin datos"}
                        color="red"
                    />
                </div>
            )}

            {/* Tabs for detailed views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                    <TabsTrigger value="activity" className="gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="hidden sm:inline">Actividad</span>
                    </TabsTrigger>
                    <TabsTrigger value="sleep" className="gap-2">
                        <Moon className="h-4 w-4" />
                        <span className="hidden sm:inline">Sueño</span>
                    </TabsTrigger>
                    <TabsTrigger value="heartrate" className="gap-2">
                        <Heart className="h-4 w-4" />
                        <span className="hidden sm:inline">Corazón</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="activity">
                    <ActivityView data={data.activity ?? []} days={days} />
                </TabsContent>

                <TabsContent value="sleep">
                    <SleepView data={data.sleep ?? []} days={days} />
                </TabsContent>

                <TabsContent value="heartrate">
                    <HeartRateView data={data.heartRate ?? []} days={days} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
