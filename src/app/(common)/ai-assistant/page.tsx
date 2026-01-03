"use client";

import React, { useState } from "react";
import { ChatInterface } from "@/components/ai-chat/ChatInterface";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger/client-safe";

const LOG_SOURCE = "AIAssistantPage";

export default function AIAssistantPage() {
  const { status } = useSession();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  React.useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  React.useEffect(() => {
    // Get user's first Google Calendar account
    const fetchAccount = async () => {
      try {
        const response = await fetch("/api/calendar/accounts");
        if (response.ok) {
          const data = await response.json();
          const googleAccount = data.accounts?.find(
            (acc: { provider: string }) => acc.provider === "google"
          );
          if (googleAccount) {
            setSelectedAccountId(googleAccount.id);
            logger.info(
              "Selected Google account for AI assistant",
              { accountId: googleAccount.id },
              LOG_SOURCE
            );
          }
        }
      } catch (error) {
        logger.error(
          "Failed to fetch calendar accounts",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
      }
    };

    if (status === "authenticated") {
      fetchAccount();
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!selectedAccountId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-xl font-semibold">
            No hay cuenta de Google Calendar conectada
          </h2>
          <p className="text-gray-600">
            Por favor conecta una cuenta de Google Calendar primero.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900">
      <ChatInterface accountId={selectedAccountId} />
    </div>
  );
}
