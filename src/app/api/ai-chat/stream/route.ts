import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";
import { mcpTools } from "@/lib/mcp-server";

const LOG_SOURCE = "AIChatStreamingAPI";

// System prompt for the AI assistant
const SYSTEM_PROMPT = `Eres un asistente personal de calendario y productividad para una aplicación llamada FluidCalendar.

Tienes acceso a las siguientes herramientas:

CALENDARIO:
- list_events: Listar eventos del calendario
- create_event: Crear un nuevo evento
- find_free_slots: Encontrar espacios libres

FITBIT:
- get_fitbit_activity: Obtener actividad de hoy
- get_fitbit_sleep: Obtener datos de sueño
- get_fitbit_heart_rate: Obtener frecuencia cardíaca
- get_recent_fitbit_activity: Obtener actividad de los últimos días

TAREAS:
- get_tasks: Listar tareas pendientes
- create_task: Crear nueva tarea

Cuando el usuario pregunte algo, analiza su intención y responde de forma útil.
Si necesitas datos específicos, primero indica que estás consultando y luego proporciona la información.
Responde SIEMPRE en español. Sé conciso pero amigable.`;

/**
 * Streaming AI Chat endpoint using Groq API
 */
export async function POST(request: NextRequest) {
    try {
        const authOptions = await getAuthOptions();
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.id) {
            logger.warn("Unauthorized AI chat stream request", {}, LOG_SOURCE);
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const { messages, accountId } = await request.json();
        const userId = session.user.id;

        // Check for Groq API key
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            logger.error("GROQ_API_KEY not configured", {}, LOG_SOURCE);
            return new Response(
                JSON.stringify({ error: "AI service not configured" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        logger.info(
            "Starting AI chat stream",
            { userId, messageCount: messages.length },
            LOG_SOURCE
        );

        // Build conversation for the LLM
        const llmMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((m: { role: string; content: string }) => ({
                role: m.role,
                content: m.content,
            })),
        ];

        // Make streaming request to Groq
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.1-70b-versatile",
                messages: llmMessages,
                stream: true,
                temperature: 0.7,
                max_tokens: 1024,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            logger.error("Groq API error", { status: response.status, error }, LOG_SOURCE);
            return new Response(
                JSON.stringify({ error: "AI service error" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Create a TransformStream to process the SSE response
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const transformStream = new TransformStream({
            async transform(chunk, controller) {
                const text = decoder.decode(chunk);
                const lines = text.split("\n").filter((line) => line.trim() !== "");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        if (data === "[DONE]") {
                            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                            continue;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                // Forward the content as SSE
                                controller.enqueue(
                                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                                );
                            }
                        } catch {
                            // Skip malformed JSON
                        }
                    }
                }
            },
        });

        // Pipe the response through our transform
        const stream = response.body?.pipeThrough(transformStream);

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error) {
        logger.error(
            "AI chat stream failed",
            { error: error instanceof Error ? error.message : "Unknown" },
            LOG_SOURCE
        );

        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
