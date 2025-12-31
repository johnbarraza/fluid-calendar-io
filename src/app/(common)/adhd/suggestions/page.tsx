"use client";

import * as React from "react";
import { LuSparkles as Sparkles, LuTrendingUp as TrendingUp, LuCalendar as Calendar, LuClock as Clock } from "react-icons/lu";
import { toast } from "sonner";
import { SuggestionPanel } from "@/components/adhd/suggestions";
import { useSuggestionStore } from "@/store/adhd/suggestionStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function SuggestionsPage() {
  const { suggestions, fetchSuggestions, generateSuggestions, loading } = useSuggestionStore();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [stats, setStats] = React.useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    highConfidence: 0,
  });

  React.useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  React.useEffect(() => {
    if (suggestions.length > 0) {
      const pending = suggestions.filter((s) => s.status === "pending").length;
      const accepted = suggestions.filter((s) => s.status === "accepted").length;
      const rejected = suggestions.filter((s) => s.status === "rejected").length;
      const highConfidence = suggestions.filter((s) => s.confidence >= 0.8).length;

      setStats({
        total: suggestions.length,
        pending,
        accepted,
        rejected,
        highConfidence,
      });
    }
  }, [suggestions]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateSuggestions();
      toast.success("Sugerencias generadas exitosamente");
    } catch (error) {
      toast.error("Error al generar sugerencias");
      console.error("Failed to generate suggestions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8)
      return { label: "Alta confianza", color: "bg-green-500/10 text-green-500" };
    if (confidence >= 0.6)
      return { label: "Confianza media", color: "bg-yellow-500/10 text-yellow-500" };
    return { label: "Baja confianza", color: "bg-orange-500/10 text-orange-500" };
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sugerencias Inteligentes</h1>
            <p className="text-sm text-muted-foreground">
              Optimiza tu calendario con sugerencias basadas en IA
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating ? "Generando..." : "Generar Sugerencias"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Stats Cards */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.total === 1 ? "sugerencia" : "sugerencias"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Pendientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <p className="text-xs text-muted-foreground">para revisar</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Alta confianza
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.highConfidence}</div>
                  <p className="text-xs text-muted-foreground">≥80% confianza</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    Aceptadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.accepted}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.total > 0
                      ? `${Math.round((stats.accepted / stats.total) * 100)}% del total`
                      : "0%"}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Info Card for Empty State */}
          {!loading && suggestions.length === 0 && (
            <Card className="border-dashed">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>¿Cómo funcionan las sugerencias?</CardTitle>
                </div>
                <CardDescription>
                  Nuestro sistema de IA analiza tus patrones de trabajo y estado de ánimo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">📊 Análisis de patrones</h4>
                  <p className="text-sm text-muted-foreground">
                    Evaluamos tu energía, estado de ánimo y productividad histórica para
                    identificar tus mejores momentos de trabajo.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">🎯 Optimización de tareas</h4>
                  <p className="text-sm text-muted-foreground">
                    Sugerimos los mejores horarios para cada tarea basándonos en su duración,
                    prioridad y tipo de trabajo requerido.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">✨ Mejora continua</h4>
                  <p className="text-sm text-muted-foreground">
                    Cuantos más datos tengas de estado de ánimo y hábitos, más precisas serán
                    las sugerencias.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button onClick={handleGenerate} disabled={isGenerating}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isGenerating ? "Generando..." : "Generar Primera Sugerencia"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions Panel */}
          <SuggestionPanel onGenerate={handleGenerate} />

          {/* Tips Card */}
          {suggestions.length > 0 && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  💡 Consejos para mejores sugerencias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  • Registra tu estado de ánimo regularmente para obtener recomendaciones más
                  personalizadas
                </p>
                <p>
                  • Acepta o rechaza sugerencias para entrenar el sistema y mejorar la precisión
                </p>
                <p>
                  • Las sugerencias con{" "}
                  <Badge variant="secondary" className={getConfidenceBadge(0.8).color}>
                    {getConfidenceBadge(0.8).label}
                  </Badge>{" "}
                  son más confiables
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
