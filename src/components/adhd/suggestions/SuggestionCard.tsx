"use client";

import * as React from "react";
import { LuCheck as Check, LuX as X, LuClock as Clock, LuTriangleAlert as AlertTriangle, LuCalendar as Calendar } from "react-icons/lu";
import { ScheduleSuggestion } from "@prisma/client";
import { SuggestionWithTask } from "@/store/adhd/suggestionStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SuggestionCardProps {
  suggestion: SuggestionWithTask;
  onAccept?: (suggestionId: string) => Promise<void>;
  onReject?: (suggestionId: string) => Promise<void>;
}

/**
 * SuggestionCard Component
 *
 * Displays a single schedule suggestion with:
 * - Task information
 * - Suggested time slot
 * - Reason for suggestion
 * - Confidence score
 * - Accept/Reject actions
 */
export function SuggestionCard({ suggestion, onAccept, onReject }: SuggestionCardProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleAccept = async () => {
    if (!onAccept) return;
    setIsProcessing(true);
    try {
      await onAccept(suggestion.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setIsProcessing(true);
    try {
      await onReject(suggestion.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const getReasonIcon = () => {
    if (suggestion.reason.includes("conflict")) return AlertTriangle;
    if (suggestion.reason.includes("deadline")) return Clock;
    return Calendar;
  };

  const getReasonColor = () => {
    if (suggestion.reason.includes("conflict")) return "text-red-500";
    if (suggestion.reason.includes("deadline")) return "text-orange-500";
    return "text-blue-500";
  };

  const getConfidenceColor = () => {
    if (suggestion.confidence >= 0.8) return "bg-green-500/10 text-green-500";
    if (suggestion.confidence >= 0.6) return "bg-yellow-500/10 text-yellow-500";
    return "bg-orange-500/10 text-orange-500";
  };

  const ReasonIcon = getReasonIcon();

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">
              {suggestion.task?.title || "Tarea"}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <ReasonIcon className={cn("h-3 w-3", getReasonColor())} />
              <span className="text-xs">{suggestion.reason}</span>
            </CardDescription>
          </div>
          <Badge variant="secondary" className={cn("text-xs", getConfidenceColor())}>
            {Math.round(suggestion.confidence * 100)}% confianza
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Suggested Time Slot */}
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">Tiempo sugerido</p>
              <p className="text-muted-foreground">
                {format(new Date(suggestion.suggestedStart), "PPP", { locale: es })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">
                {format(new Date(suggestion.suggestedStart), "HH:mm")} -{" "}
                {format(new Date(suggestion.suggestedEnd), "HH:mm")}
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round(
                  (new Date(suggestion.suggestedEnd).getTime() -
                    new Date(suggestion.suggestedStart).getTime()) /
                    (1000 * 60)
                )}{" "}
                min
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {suggestion.status === "pending" && (
          <div className="flex gap-2">
            <Button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1"
              size="sm"
            >
              <Check className="mr-2 h-4 w-4" />
              Aceptar
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <X className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
          </div>
        )}

        {/* Status Badge for non-pending suggestions */}
        {suggestion.status !== "pending" && (
          <div className="flex justify-center">
            <Badge
              variant={suggestion.status === "accepted" ? "default" : "secondary"}
              className="text-xs"
            >
              {suggestion.status === "accepted" ? "Aceptada" : "Rechazada"}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
