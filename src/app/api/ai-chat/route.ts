import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";
import {
  listEvents,
  createEvent,
  findFreeSlots,
} from "@/lib/mcp/tools/calendar-tools";
import {
  getActivity,
  getSleep,
  getHeartRate,
  getRecentActivity,
} from "@/lib/mcp/tools/fitbit-tools";
import {
  getTasks,
  createTask,
} from "@/lib/mcp/tools/task-tools";

const LOG_SOURCE = "AIChatAPI";


interface ToolCall {
  name: string;
  result: string;
}

/**
 * AI Chat endpoint that processes natural language requests
 * and executes calendar operations using MCP tools
 */
export async function POST(request: NextRequest) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      logger.warn("Unauthorized AI chat request", {}, LOG_SOURCE);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, accountId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Process the user's message and determine intent
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content.toLowerCase();

    const toolCalls: ToolCall[] = [];
    let responseContent = "";

    logger.info(
      "Processing AI chat request",
      { userId, query: userQuery },
      LOG_SOURCE
    );

    // Simple intent detection (could be replaced with actual LLM)
    try {
      // List events intent
      if (
        userQuery.includes("eventos") ||
        userQuery.includes("reuniones") ||
        userQuery.includes("agenda") ||
        userQuery.includes("muéstrame") ||
        userQuery.includes("ver")
      ) {
        const now = new Date();
        let timeMin = now.toISOString();
        let timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

        // Check for "mañana" (tomorrow)
        if (userQuery.includes("mañana")) {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          timeMin = tomorrow.toISOString();
          timeMax = new Date(
            tomorrow.getTime() + 24 * 60 * 60 * 1000
          ).toISOString();
        }

        // Check for "hoy" (today)
        if (userQuery.includes("hoy")) {
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);
          timeMin = today.toISOString();
          timeMax = new Date(
            today.getTime() + 24 * 60 * 60 * 1000
          ).toISOString();
        }

        // Check for "semana" (week)
        if (userQuery.includes("semana")) {
          timeMax = new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000
          ).toISOString();
        }

        const result = await listEvents(userId, {
          accountId,
          calendarId: "primary",
          timeMin,
          timeMax,
          maxResults: 20,
        });

        toolCalls.push({
          name: "list_events",
          result: JSON.stringify(result),
        });

        if (result.events.length === 0) {
          responseContent = "No tienes eventos próximos en ese período.";
        } else {
          responseContent = `Tienes ${result.events.length} evento(s):\n\n`;
          result.events.forEach((event, idx) => {
            const startTime = event.start
              ? new Date(event.start).toLocaleString("es-ES", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Sin hora";
            responseContent += `${idx + 1}. ${event.summary || "Sin título"} - ${startTime}\n`;
            if (event.location) {
              responseContent += `   📍 ${event.location}\n`;
            }
          });
        }
      }

      // Create event intent
      else if (
        userQuery.includes("crear") ||
        userQuery.includes("agregar") ||
        userQuery.includes("nueva reunión") ||
        userQuery.includes("nuevo evento")
      ) {
        // Simple parsing for event creation
        // In production, use an LLM to extract structured data
        const now = new Date();
        const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

        const result = await createEvent(userId, {
          accountId,
          calendarId: "primary",
          summary: "Evento creado por IA",
          description: `Solicitud: ${lastMessage.content}`,
          start: start.toISOString(),
          end: end.toISOString(),
        });

        toolCalls.push({
          name: "create_event",
          result: JSON.stringify(result),
        });

        responseContent = `He creado el evento "${result.summary}" para ${new Date(result.start || "").toLocaleString("es-ES")}. Puedes verlo en tu calendario.`;
      }

      // Find free slots intent
      else if (
        userQuery.includes("libre") ||
        userQuery.includes("disponible") ||
        userQuery.includes("tiempo") ||
        userQuery.includes("espacio")
      ) {
        const now = new Date();
        const timeMin = now.toISOString();
        const timeMax = new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        const result = await findFreeSlots(userId, {
          accountId,
          calendarIds: ["primary"],
          timeMin,
          timeMax,
          duration: 60,
          workingHours: {
            start: 9,
            end: 17,
          },
        });

        toolCalls.push({
          name: "find_free_slots",
          result: JSON.stringify(result),
        });

        if (result.freeSlots.length === 0) {
          responseContent =
            "No encontré espacios libres en las próximas fechas durante el horario laboral.";
        } else {
          responseContent = `Encontré ${result.freeSlots.length} espacios libres:\n\n`;
          result.freeSlots.slice(0, 5).forEach((slot, idx) => {
            const startTime = new Date(slot.start).toLocaleString("es-ES", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            responseContent += `${idx + 1}. ${startTime} (${slot.duration} min)\n`;
          });

          if (result.freeSlots.length > 5) {
            responseContent += `\n...y ${result.freeSlots.length - 5} más`;
          }
        }
      }

      // Fitbit activity intent
      else if (
        userQuery.includes("pasos") ||
        userQuery.includes("actividad") ||
        userQuery.includes("ejercicio") ||
        userQuery.includes("caminado") ||
        userQuery.includes("calorías") ||
        userQuery.includes("fitbit")
      ) {
        const today = new Date().toISOString().split("T")[0];

        // Check if asking for recent/week summary
        if (
          userQuery.includes("semana") ||
          userQuery.includes("últimos días") ||
          userQuery.includes("reciente")
        ) {
          const result = await getRecentActivity(userId, { days: 7 });

          toolCalls.push({
            name: "get_recent_fitbit_activity",
            result: JSON.stringify(result),
          });

          if (result.error) {
            responseContent = "No pude obtener tus datos de actividad de Fitbit. Asegúrate de tener tu cuenta conectada.";
          } else if (result.summary) {
            responseContent = `Resumen de actividad de los últimos ${result.period?.days || 7} días:\n\n`;
            responseContent += `📊 Total de pasos: ${result.summary.totalSteps.toLocaleString()}\n`;
            responseContent += `🏃 Promedio diario: ${result.summary.averageSteps.toLocaleString()} pasos\n`;
            responseContent += `📏 Distancia total: ${result.summary.totalDistance} km\n`;
            responseContent += `🔥 Calorías quemadas: ${result.summary.totalCalories.toLocaleString()}\n`;
            responseContent += `📅 Días con datos: ${result.summary.daysWithData}`;
          }
        } else {
          // Today's activity
          const result = await getActivity(userId, { date: today });

          toolCalls.push({
            name: "get_fitbit_activity",
            result: JSON.stringify(result),
          });

          if (result.error) {
            responseContent = "No pude obtener tus datos de actividad de hoy. Asegúrate de tener tu cuenta Fitbit conectada.";
          } else {
            responseContent = `Tu actividad de hoy (${today}):\n\n`;
            responseContent += `👟 Pasos: ${result.steps?.toLocaleString() || 0}\n`;
            responseContent += `📏 Distancia: ${result.distance || 0} km\n`;
            responseContent += `🔥 Calorías: ${result.calories?.toLocaleString() || 0}\n`;
            responseContent += `⚡ Minutos activos: ${result.activeMinutes || 0}\n`;
            if (result.floors) {
              responseContent += `🪜 Pisos: ${result.floors}`;
            }
          }
        }
      }

      // Fitbit sleep intent
      else if (
        userQuery.includes("sueño") ||
        userQuery.includes("dormido") ||
        userQuery.includes("dormir") ||
        userQuery.includes("descanso") ||
        userQuery.includes("dormí")
      ) {
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const result = await getSleep(userId, {
          startDate: yesterdayStr,
          endDate: today,
        });

        toolCalls.push({
          name: "get_fitbit_sleep",
          result: JSON.stringify(result),
        });

        if (result.error) {
          responseContent = "No pude obtener tus datos de sueño. Asegúrate de tener tu cuenta Fitbit conectada.";
        } else if (result.sleepSessions && result.sleepSessions.length > 0) {
          const latestSleep = result.sleepSessions[result.sleepSessions.length - 1];
          const hoursSlept = (latestSleep.minutesAsleep / 60).toFixed(1);

          responseContent = `Tu último período de sueño (${latestSleep.date}):\n\n`;
          responseContent += `😴 Duración: ${hoursSlept} horas (${latestSleep.minutesAsleep} minutos)\n`;
          responseContent += `✅ Eficiencia: ${latestSleep.efficiency}%\n`;
          responseContent += `⏰ Tiempo en cama: ${latestSleep.timeInBed} minutos\n`;

          if (latestSleep.deepSleep || latestSleep.lightSleep || latestSleep.remSleep) {
            responseContent += `\nEtapas de sueño:\n`;
            if (latestSleep.deepSleep) responseContent += `  🌙 Profundo: ${latestSleep.deepSleep} min\n`;
            if (latestSleep.lightSleep) responseContent += `  💤 Ligero: ${latestSleep.lightSleep} min\n`;
            if (latestSleep.remSleep) responseContent += `  🌟 REM: ${latestSleep.remSleep} min\n`;
          }
        } else {
          responseContent = "No tengo datos de sueño recientes. Sincroniza tu Fitbit para ver esta información.";
        }
      }

      // Fitbit heart rate intent
      else if (
        userQuery.includes("corazón") ||
        userQuery.includes("frecuencia cardíaca") ||
        userQuery.includes("pulsaciones") ||
        userQuery.includes("ritmo cardíaco")
      ) {
        const today = new Date().toISOString().split("T")[0];
        const result = await getHeartRate(userId, { date: today });

        toolCalls.push({
          name: "get_fitbit_heart_rate",
          result: JSON.stringify(result),
        });

        if (result.error) {
          responseContent = "No pude obtener tus datos de frecuencia cardíaca. Asegúrate de tener tu cuenta Fitbit conectada.";
        } else {
          responseContent = `Tu frecuencia cardíaca de hoy (${today}):\n\n`;
          if (result.restingHeartRate) {
            responseContent += `💓 FC en reposo: ${result.restingHeartRate} bpm\n`;
          }
          if (result.averageHeartRate) {
            responseContent += `📊 FC promedio: ${result.averageHeartRate} bpm\n`;
          }
          if (result.maxHeartRate && result.minHeartRate) {
            responseContent += `📈 Rango: ${result.minHeartRate} - ${result.maxHeartRate} bpm`;
          }
        }
      }

      // Tasks - List intent
      else if (
        userQuery.includes("tarea") ||
        userQuery.includes("tareas") ||
        userQuery.includes("pendiente") ||
        userQuery.includes("por hacer") ||
        userQuery.includes("to do") ||
        userQuery.includes("lista")
      ) {
        // Check if asking for completed tasks
        if (userQuery.includes("completada") || userQuery.includes("terminada")) {
          const result = await getTasks(userId, { status: "completed", limit: 10 });

          toolCalls.push({
            name: "get_tasks",
            result: JSON.stringify(result),
          });

          if (result.count === 0) {
            responseContent = "No tienes tareas completadas recientemente.";
          } else {
            responseContent = `Tareas completadas (${result.count}):\n\n`;
            result.tasks.forEach((task, idx) => {
              responseContent += `${idx + 1}. ${task.title}`;
              if (task.project) {
                responseContent += ` (${task.project.name})`;
              }
              responseContent += "\n";
            });
          }
        }
        // Check if asking for today's tasks
        else if (userQuery.includes("hoy")) {
          const today = new Date().toISOString().split("T")[0];
          const result = await getTasks(userId, {
            status: "todo",
            dueDate: today,
            limit: 20,
          });

          toolCalls.push({
            name: "get_tasks",
            result: JSON.stringify(result),
          });

          if (result.count === 0) {
            responseContent = "No tienes tareas pendientes para hoy.";
          } else {
            responseContent = `Tareas de hoy (${result.count}):\n\n`;
            result.tasks.forEach((task, idx) => {
              responseContent += `${idx + 1}. ${task.title}`;
              if (task.priority && task.priority !== "none") {
                const priorityEmoji = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "🟢";
                responseContent += ` ${priorityEmoji}`;
              }
              if (task.project) {
                responseContent += ` (${task.project.name})`;
              }
              responseContent += "\n";
            });
          }
        }
        // Check if asking for urgent/high priority tasks
        else if (userQuery.includes("urgente") || userQuery.includes("importante") || userQuery.includes("prioridad")) {
          const result = await getTasks(userId, {
            status: "todo",
            priority: "high",
            limit: 20,
          });

          toolCalls.push({
            name: "get_tasks",
            result: JSON.stringify(result),
          });

          if (result.count === 0) {
            responseContent = "No tienes tareas urgentes en este momento.";
          } else {
            responseContent = `Tareas urgentes (${result.count}):\n\n`;
            result.tasks.forEach((task, idx) => {
              responseContent += `${idx + 1}. 🔴 ${task.title}`;
              if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                const today = new Date();
                const isOverdue = dueDate < today;
                responseContent += ` - ${isOverdue ? "⏰ VENCIDA" : `📅 ${task.dueDate}`}`;
              }
              if (task.project) {
                responseContent += ` (${task.project.name})`;
              }
              responseContent += "\n";
            });
          }
        }
        // Default: list all pending tasks
        else {
          const result = await getTasks(userId, { status: "todo", limit: 20 });

          toolCalls.push({
            name: "get_tasks",
            result: JSON.stringify(result),
          });

          if (result.count === 0) {
            responseContent = "No tienes tareas pendientes. ¡Buen trabajo!";
          } else {
            responseContent = `Tareas pendientes (${result.count}):\n\n`;
            result.tasks.forEach((task, idx) => {
              responseContent += `${idx + 1}. ${task.title}`;
              if (task.priority && task.priority !== "none") {
                const priorityEmoji = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "🟢";
                responseContent += ` ${priorityEmoji}`;
              }
              if (task.dueDate) {
                responseContent += ` - 📅 ${task.dueDate}`;
              }
              if (task.project) {
                responseContent += ` (${task.project.name})`;
              }
              responseContent += "\n";
            });
          }
        }
      }

      // Tasks - Create intent
      else if (
        (userQuery.includes("crear") || userQuery.includes("agregar") || userQuery.includes("nueva")) &&
        (userQuery.includes("tarea") || userQuery.includes("to do"))
      ) {
        // Extract task title from query (simple extraction)
        const taskTitle = userQuery
          .replace(/crear|agregar|nueva|tarea|to do/gi, "")
          .replace(/:/g, "")
          .trim();

        if (!taskTitle) {
          responseContent = "Por favor especifica el título de la tarea. Ejemplo: 'Crear tarea: Comprar leche'";
        } else {
          const result = await createTask(userId, { title: taskTitle });

          toolCalls.push({
            name: "create_task",
            result: JSON.stringify(result),
          });

          if (result.error) {
            responseContent = `No pude crear la tarea: ${result.message || "Error desconocido"}`;
          } else {
            responseContent = `✅ Tarea creada: "${result.task?.title}"`;
            if (result.task?.id) {
              responseContent += `\n\nPuedes verla en tu lista de tareas.`;
            }
          }
        }
      }

      // Tasks - Complete intent
      else if (
        (userQuery.includes("completar") || userQuery.includes("marcar") || userQuery.includes("terminar")) &&
        (userQuery.includes("tarea") || userQuery.includes("to do"))
      ) {
        responseContent = "Para completar una tarea, necesito el ID o título específico. Intenta con: '¿Qué tareas tengo?' primero para ver la lista.";
      }

      // Default response
      else {
        responseContent =
          "Puedo ayudarte con tu calendario, tareas y datos de Fitbit. Intenta preguntarme sobre tus eventos, tareas pendientes, crear reuniones, encontrar espacios libres, o consultar tu actividad física y sueño.";
      }
    } catch (error) {
      logger.error(
        "Error executing AI chat tools",
        { error: error instanceof Error ? error.message : "Unknown" },
        LOG_SOURCE
      );

      responseContent =
        "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente.";
    }

    logger.info(
      "AI chat response generated",
      { userId, toolCallsCount: toolCalls.length },
      LOG_SOURCE
    );

    return NextResponse.json({
      content: responseContent,
      toolCalls,
    });
  } catch (error) {
    logger.error(
      "AI chat request failed",
      { error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
