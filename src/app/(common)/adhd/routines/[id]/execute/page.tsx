"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RoutineExecutor } from "@/components/adhd/routines";
import { useRoutineStore } from "@/store/adhd/routineStore";

interface ExecutePageProps {
  params: { id: string };
}

export default function ExecutePage({ params }: ExecutePageProps) {
  const router = useRouter();
  const { routines, fetchRoutines } = useRoutineStore();
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [isStarting, setIsStarting] = React.useState(true);

  const routine = routines.find((r) => r.id === params.id);

  React.useEffect(() => {
    if (routines.length === 0) {
      fetchRoutines();
    }
  }, [routines.length, fetchRoutines]);

  React.useEffect(() => {
    if (routine && !sessionId && isStarting) {
      startSession();
    }
  }, [routine, sessionId, isStarting]);

  const startSession = async () => {
    try {
      const response = await fetch(
        `/api/adhd/routines/${params.id}/tracking`,
        {
          method: "POST",
        }
      );

      if (!response.ok) throw new Error("Failed to start session");

      const session = await response.json();
      setSessionId(session.id);
      setIsStarting(false);
    } catch (error) {
      toast.error("Error al iniciar sesión de rutina");
      console.error("Failed to start session:", error);
      router.push("/adhd/routines");
    }
  };

  const handleComplete = async (notes?: string) => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `/api/adhd/routines/tracking/${sessionId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        }
      );

      if (!response.ok) throw new Error("Failed to complete session");

      toast.success("¡Rutina completada! 🎉");
      router.push("/adhd/routines");
    } catch (error) {
      toast.error("Error al completar rutina");
      console.error("Failed to complete session:", error);
    }
  };

  const handleAbandon = async (reason?: string) => {
    if (!sessionId) {
      router.push("/adhd/routines");
      return;
    }

    try {
      const response = await fetch(
        `/api/adhd/routines/tracking/${sessionId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) throw new Error("Failed to abandon session");

      toast.info("Rutina abandonada");
      router.push("/adhd/routines");
    } catch (error) {
      toast.error("Error al abandonar rutina");
      console.error("Failed to abandon session:", error);
      router.push("/adhd/routines");
    }
  };

  if (!routine) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-4xl">⏳</div>
          <p className="text-sm text-muted-foreground">Cargando rutina...</p>
        </div>
      </div>
    );
  }

  if (isStarting) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-4xl">🚀</div>
          <p className="text-sm text-muted-foreground">
            Iniciando rutina...
          </p>
        </div>
      </div>
    );
  }

  return <RoutineExecutor routine={routine} onComplete={handleComplete} onAbandon={handleAbandon} />;
}
