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
  isStreaming?: boolean;
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
        "¡Hola! Soy tu asistente de calendario y productividad. Puedo ayudarte a ver eventos, crear reuniones, revisar tareas y consultar tu actividad Fitbit. ¿En qué puedo ayudarte?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    // Add user message and prepare assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Cancel any previous request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/ai-chat/stream", {
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
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // Fallback to non-streaming endpoint
        const fallbackResponse = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            accountId,
          }),
        });

        const fallbackData = await fallbackResponse.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: fallbackData.content, isStreaming: false }
              : m
          )
        );
        return;
      }

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulator = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulator += parsed.content;
                  // Update the message with accumulated content
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: accumulator }
                        : m
                    )
                  );
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, isStreaming: false } : m
        )
      );

      logger.info("AI chat stream completed", {}, LOG_SOURCE);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return; // User cancelled
      }

      logger.error(
        "Failed to get AI response",
        { error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
              ...m,
              content:
                "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente.",
              isStreaming: false,
            }
            : m
        )
      );
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
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold">Asistente IA</h2>
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
            Online
          </span>
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-lg p-3 ${message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
                }`}
            >
              <p className="whitespace-pre-wrap text-sm">
                {message.content}
                {message.isStreaming && (
                  <span className="ml-1 inline-block animate-pulse">▊</span>
                )}
              </p>

              <div className="mt-1 text-xs opacity-60">
                {message.timestamp.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <Loader className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Pensando...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="flex-1 resize-none rounded-lg border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
        <p className="mt-2 text-xs text-muted-foreground">
          Ejemplos: &quot;¿Qué eventos tengo mañana?&quot;, &quot;¿Cuántos pasos
          llevo esta semana?&quot;, &quot;Muéstrame mis tareas pendientes&quot;
        </p>
      </div>
    </div>
  );
}
