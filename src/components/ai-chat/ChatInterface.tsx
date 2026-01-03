"use client";

import React, { useState, useRef, useEffect } from "react";
import { LuSend as Send } from "react-icons/lu";
import { LuUser as User } from "react-icons/lu";
import { LuBot as Bot } from "react-icons/lu";
import { LuLoader as Loader } from "react-icons/lu";
import { LuX as X } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger/client-safe";

const LOG_SOURCE = "ChatInterface";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: {
    name: string;
    result: string;
  }[];
}

interface ChatInterfaceProps {
  accountId: string;
  onClose?: () => void;
}

export function ChatInterface({ accountId, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "¡Hola! Soy tu asistente de calendario. Puedo ayudarte a ver tus eventos, crear nuevos, encontrar espacios libres y más. ¿En qué puedo ayudarte?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          accountId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        toolCalls: data.toolCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      logger.info(
        "AI chat response received",
        { toolCallsCount: data.toolCalls?.length || 0 },
        LOG_SOURCE
      );
    } catch (error) {
      logger.error(
        "Failed to get AI response",
        { error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-blue-500" />
          <h2 className="text-lg font-semibold">Asistente de Calendario</h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>

              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-gray-300 pt-2 dark:border-gray-600">
                  {message.toolCalls.map((tool, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-gray-600 dark:text-gray-400"
                    >
                      🔧 {tool.name}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-1 text-xs opacity-60">
                {message.timestamp.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
              <Loader className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Pensando...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="flex-1 resize-none rounded-lg border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-auto px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Ejemplos: &quot;Muéstrame mis eventos de mañana&quot;, &quot;Crea
          una reunión para las 3pm&quot;, &quot;¿Cuándo tengo tiempo
          libre?&quot;
        </p>
      </div>
    </div>
  );
}
