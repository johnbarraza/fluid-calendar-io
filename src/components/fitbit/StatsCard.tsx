"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: "up" | "down" | "neutral";
    subtitle?: string;
    color?: "blue" | "purple" | "red" | "green";
}

const colorClasses = {
    blue: {
        icon: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/50",
        border: "border-blue-200 dark:border-blue-800",
    },
    purple: {
        icon: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-950/50",
        border: "border-purple-200 dark:border-purple-800",
    },
    red: {
        icon: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950/50",
        border: "border-red-200 dark:border-red-800",
    },
    green: {
        icon: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-950/50",
        border: "border-green-200 dark:border-green-800",
    },
};

export function StatsCard({ title, value, icon, trend = "neutral", subtitle, color = "blue" }: StatsCardProps) {
    const colors = colorClasses[color];

    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
    const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground";

    return (
        <Card className={cn("transition-all hover:shadow-md", colors.border)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={cn("rounded-full p-2", colors.bg)}>
                    <span className={colors.icon}>{icon}</span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{value}</span>
                    <TrendIcon className={cn("h-4 w-4", trendColor)} />
                </div>
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                )}
            </CardContent>
        </Card>
    );
}
