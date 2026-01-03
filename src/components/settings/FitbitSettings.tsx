"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Heart, Moon, RefreshCw, Unplug } from "lucide-react";
import { logger } from "@/lib/logger/client-safe";

const LOG_SOURCE = "FitbitSettings";

interface FitbitAccount {
  id: string;
  fitbitUserId: string;
  createdAt: string;
  updatedAt: string;
}

export function FitbitSettings() {
  const [account, setAccount] = useState<FitbitAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchFitbitAccount();
  }, []);

  const fetchFitbitAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/fitbit/status");

      if (response.ok) {
        const data = await response.json();
        setAccount(data.account || null);
      } else {
        setAccount(null);
      }
    } catch (error) {
      logger.error(
        "Failed to fetch Fitbit account",
        { error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/fitbit/auth";
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/fitbit/sync", {
        method: "POST",
      });

      if (response.ok) {
        logger.info("Fitbit data synced successfully", {}, LOG_SOURCE);
        alert("Datos sincronizados correctamente");
      } else {
        const error = await response.json();
        logger.error(
          "Fitbit sync failed",
          { error: error.message },
          LOG_SOURCE
        );
        alert(`Error al sincronizar: ${error.message || "Error desconocido"}`);
      }
    } catch (error) {
      logger.error(
        "Fitbit sync request failed",
        { error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      alert("Error al sincronizar datos de Fitbit");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("¿Estás seguro de que quieres desconectar tu cuenta de Fitbit?")) {
      return;
    }

    try {
      setDisconnecting(true);
      const response = await fetch("/api/fitbit/disconnect", {
        method: "DELETE",
      });

      if (response.ok) {
        logger.info("Fitbit account disconnected", {}, LOG_SOURCE);
        setAccount(null);
        alert("Cuenta de Fitbit desconectada");
      } else {
        const error = await response.json();
        logger.error(
          "Fitbit disconnect failed",
          { error: error.message },
          LOG_SOURCE
        );
        alert(`Error al desconectar: ${error.message || "Error desconocido"}`);
      }
    } catch (error) {
      logger.error(
        "Fitbit disconnect request failed",
        { error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );
      alert("Error al desconectar cuenta de Fitbit");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integración Fitbit</CardTitle>
          <CardDescription>
            Conecta tu cuenta de Fitbit para acceder a datos de actividad, sueño y salud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Integración Fitbit
        </CardTitle>
        <CardDescription>
          Conecta tu cuenta de Fitbit para acceder a datos de actividad, sueño y salud
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {account ? (
          <>
            {/* Connected State */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">
                    Conectado
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ID: {account.fitbitUserId}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Última actualización:{" "}
                  {new Date(account.updatedAt).toLocaleString("es-ES")}
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Activity className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Actividad Diaria</p>
                  <p className="text-xs text-muted-foreground">
                    Pasos, distancia, calorías
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Moon className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Sueño</p>
                  <p className="text-xs text-muted-foreground">
                    Duración, eficiencia, etapas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Heart className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Frecuencia Cardíaca</p>
                  <p className="text-xs text-muted-foreground">
                    FC en reposo, zonas
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="outline"
                className="flex-1"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sincronizar
                  </>
                )}
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={disconnecting}
                variant="destructive"
              >
                {disconnecting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Desconectando...
                  </>
                ) : (
                  <>
                    <Unplug className="mr-2 h-4 w-4" />
                    Desconectar
                  </>
                )}
              </Button>
            </div>

            {/* Usage Hint */}
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 <strong>Tip:</strong> Pregunta al chat de IA sobre tu actividad:
                &quot;¿Cuántos pasos he dado hoy?&quot; o &quot;¿Cómo dormí anoche?&quot;
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <div className="text-center py-6 space-y-4">
              <div className="flex justify-center gap-4 text-muted-foreground">
                <Activity className="h-8 w-8" />
                <Moon className="h-8 w-8" />
                <Heart className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No tienes una cuenta de Fitbit conectada
                </p>
                <p className="text-xs text-muted-foreground">
                  Conecta tu Fitbit para acceder a datos de actividad, sueño y frecuencia cardíaca
                </p>
              </div>
            </div>

            <Button onClick={handleConnect} className="w-full">
              <Activity className="mr-2 h-4 w-4" />
              Conectar Fitbit
            </Button>

            {/* Benefits */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Al conectar tu Fitbit podrás:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Consultar tu actividad diaria con el chat de IA</li>
                <li>Ver datos de sueño y descanso</li>
                <li>Monitorear tu frecuencia cardíaca</li>
                <li>Recibir sugerencias personalizadas basadas en tu actividad</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
