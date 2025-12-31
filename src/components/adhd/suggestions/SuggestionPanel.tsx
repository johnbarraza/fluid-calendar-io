"use client";

import * as React from "react";
import { LuLightbulb as Lightbulb, LuRefreshCw as RefreshCw } from "react-icons/lu";
import { useSuggestionStore, SuggestionStatus } from "@/store/adhd/suggestionStore";
import { SuggestionCard } from "./SuggestionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface SuggestionPanelProps {
  autoGenerate?: boolean;
}

/**
 * SuggestionPanel Component
 *
 * Main panel for displaying schedule suggestions
 * Features:
 * - Tab filtering (pending/accepted/rejected)
 * - Generate new suggestions button
 * - Loading/empty states
 * - Accept/reject actions
 */
export function SuggestionPanel({ autoGenerate = false }: SuggestionPanelProps) {
  const {
    suggestions,
    loading,
    error,
    statusFilter,
    fetchSuggestions,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    setStatusFilter,
  } = useSuggestionStore();

  React.useEffect(() => {
    fetchSuggestions();

    if (autoGenerate && suggestions.length === 0) {
      generateSuggestions().catch(() => {
        // Silently fail auto-generation
      });
    }
  }, [fetchSuggestions]);

  const handleGenerate = async () => {
    try {
      const newSuggestions = await generateSuggestions();
      toast.success(`${newSuggestions.length} nuevas sugerencias generadas`);
    } catch (error) {
      toast.error("Error al generar sugerencias");
      console.error("Failed to generate suggestions:", error);
    }
  };

  const handleAccept = async (suggestionId: string) => {
    try {
      await acceptSuggestion(suggestionId);
      toast.success("Sugerencia aceptada y tarea reprogramada");
    } catch (error) {
      toast.error("Error al aceptar sugerencia");
      console.error("Failed to accept suggestion:", error);
    }
  };

  const handleReject = async (suggestionId: string) => {
    try {
      await rejectSuggestion(suggestionId);
      toast.info("Sugerencia rechazada");
    } catch (error) {
      toast.error("Error al rechazar sugerencia");
      console.error("Failed to reject suggestion:", error);
    }
  };

  if (loading && suggestions.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error al cargar sugerencias</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => fetchSuggestions()} variant="outline">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sugerencias Inteligentes</h2>
          <p className="text-sm text-muted-foreground">
            {pendingSuggestions.length} sugerencia{pendingSuggestions.length !== 1 ? "s" : ""}{" "}
            pendiente{pendingSuggestions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Generar Sugerencias
        </Button>
      </div>

      {/* Tabs for filtering */}
      <Tabs
        value={statusFilter}
        onValueChange={(value) => setStatusFilter(value as SuggestionStatus)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pendientes
            {pendingSuggestions.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {pendingSuggestions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted">Aceptadas</TabsTrigger>
          <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
        </TabsList>

        {/* Pending Suggestions */}
        <TabsContent value="pending" className="space-y-4">
          {pendingSuggestions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 font-semibold">No hay sugerencias pendientes</h3>
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  Genera nuevas sugerencias para optimizar tu calendario
                </p>
                <Button onClick={handleGenerate} disabled={loading}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                  Generar Sugerencias
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Accepted Suggestions */}
        <TabsContent value="accepted" className="space-y-4">
          {suggestions.filter((s) => s.status === "accepted").length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No hay sugerencias aceptadas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestions
                .filter((s) => s.status === "accepted")
                .map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))}
            </div>
          )}
        </TabsContent>

        {/* Rejected Suggestions */}
        <TabsContent value="rejected" className="space-y-4">
          {suggestions.filter((s) => s.status === "rejected").length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No hay sugerencias rechazadas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestions
                .filter((s) => s.status === "rejected")
                .map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
