import { z } from "zod";
import { getGoogleCalendarClient } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "MCPCalendarTools";

// Schemas para validación
export const ListEventsSchema = z.object({
  accountId: z.string().describe("ID de la cuenta de Google Calendar"),
  calendarId: z.string().default("primary").describe("ID del calendario"),
  timeMin: z.string().optional().describe("Fecha/hora inicio (ISO 8601)"),
  timeMax: z.string().optional().describe("Fecha/hora fin (ISO 8601)"),
  maxResults: z.number().default(10).describe("Máximo de eventos a retornar"),
  query: z.string().optional().describe("Búsqueda de texto libre"),
});

export const CreateEventSchema = z.object({
  accountId: z.string().describe("ID de la cuenta de Google Calendar"),
  calendarId: z.string().default("primary").describe("ID del calendario"),
  summary: z.string().describe("Título del evento"),
  description: z.string().optional().describe("Descripción del evento"),
  location: z.string().optional().describe("Ubicación del evento"),
  start: z.string().describe("Fecha/hora inicio (ISO 8601)"),
  end: z.string().describe("Fecha/hora fin (ISO 8601)"),
  attendees: z.array(z.string()).optional().describe("Lista de emails de asistentes"),
  reminders: z.object({
    useDefault: z.boolean().optional(),
    overrides: z.array(z.object({
      method: z.enum(["email", "popup"]),
      minutes: z.number(),
    })).optional(),
  }).optional(),
});

export const UpdateEventSchema = z.object({
  accountId: z.string().describe("ID de la cuenta"),
  calendarId: z.string().default("primary"),
  eventId: z.string().describe("ID del evento a actualizar"),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export const DeleteEventSchema = z.object({
  accountId: z.string().describe("ID de la cuenta"),
  calendarId: z.string().default("primary"),
  eventId: z.string().describe("ID del evento a eliminar"),
});

export const FindFreeSlotsSchema = z.object({
  accountId: z.string().describe("ID de la cuenta"),
  calendarIds: z.array(z.string()).default(["primary"]).describe("IDs de calendarios a verificar"),
  timeMin: z.string().describe("Fecha/hora inicio búsqueda (ISO 8601)"),
  timeMax: z.string().describe("Fecha/hora fin búsqueda (ISO 8601)"),
  duration: z.number().default(60).describe("Duración deseada del slot en minutos"),
  workingHours: z.object({
    start: z.number().default(9).describe("Hora inicio (0-23)"),
    end: z.number().default(17).describe("Hora fin (0-23)"),
  }).optional(),
});

/**
 * List events from Google Calendar
 */
export async function listEvents(userId: string, params: z.infer<typeof ListEventsSchema>) {
  try {
    const calendar = await getGoogleCalendarClient(params.accountId, userId);

    const response = await calendar.events.list({
      calendarId: params.calendarId,
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      maxResults: params.maxResults,
      q: params.query,
      singleEvents: true,
      orderBy: "startTime",
    });

    logger.info(
      `Listed ${response.data.items?.length || 0} events`,
      { userId, accountId: params.accountId },
      LOG_SOURCE
    );

    return {
      events: response.data.items?.map((event) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        status: event.status,
        attendees: event.attendees?.map((a) => ({
          email: a.email,
          responseStatus: a.responseStatus,
        })),
        htmlLink: event.htmlLink,
      })) || [],
      nextPageToken: response.data.nextPageToken,
    };
  } catch (error) {
    logger.error(
      "Failed to list events",
      { userId, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Create a new event in Google Calendar
 */
export async function createEvent(userId: string, params: z.infer<typeof CreateEventSchema>) {
  try {
    const calendar = await getGoogleCalendarClient(params.accountId, userId);

    const event = await calendar.events.insert({
      calendarId: params.calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: {
          dateTime: params.start,
          timeZone: "America/Los_Angeles", // TODO: Get from user settings
        },
        end: {
          dateTime: params.end,
          timeZone: "America/Los_Angeles",
        },
        attendees: params.attendees?.map((email) => ({ email })),
        reminders: params.reminders,
      },
    });

    logger.info(
      "Created event",
      { userId, eventId: event.data.id || "unknown" },
      LOG_SOURCE
    );

    return {
      id: event.data.id,
      summary: event.data.summary,
      start: event.data.start?.dateTime,
      end: event.data.end?.dateTime,
      htmlLink: event.data.htmlLink,
    };
  } catch (error) {
    logger.error(
      "Failed to create event",
      { userId, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Update an existing event
 */
export async function updateEvent(userId: string, params: z.infer<typeof UpdateEventSchema>) {
  try {
    const calendar = await getGoogleCalendarClient(params.accountId, userId);

    // First get the existing event
    const existing = await calendar.events.get({
      calendarId: params.calendarId,
      eventId: params.eventId,
    });

    // Update with new values
    const updated = await calendar.events.update({
      calendarId: params.calendarId,
      eventId: params.eventId,
      requestBody: {
        ...existing.data,
        summary: params.summary || existing.data.summary,
        description: params.description !== undefined ? params.description : existing.data.description,
        location: params.location !== undefined ? params.location : existing.data.location,
        start: params.start ? {
          dateTime: params.start,
          timeZone: existing.data.start?.timeZone || "America/Los_Angeles",
        } : existing.data.start,
        end: params.end ? {
          dateTime: params.end,
          timeZone: existing.data.end?.timeZone || "America/Los_Angeles",
        } : existing.data.end,
      },
    });

    logger.info(
      "Updated event",
      { userId, eventId: params.eventId },
      LOG_SOURCE
    );

    return {
      id: updated.data.id,
      summary: updated.data.summary,
      start: updated.data.start?.dateTime,
      end: updated.data.end?.dateTime,
      htmlLink: updated.data.htmlLink,
    };
  } catch (error) {
    logger.error(
      "Failed to update event",
      { userId, eventId: params.eventId, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(userId: string, params: z.infer<typeof DeleteEventSchema>) {
  try {
    const calendar = await getGoogleCalendarClient(params.accountId, userId);

    await calendar.events.delete({
      calendarId: params.calendarId,
      eventId: params.eventId,
    });

    logger.info(
      "Deleted event",
      { userId, eventId: params.eventId },
      LOG_SOURCE
    );

    return {
      success: true,
      eventId: params.eventId,
    };
  } catch (error) {
    logger.error(
      "Failed to delete event",
      { userId, eventId: params.eventId, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Find free time slots
 */
export async function findFreeSlots(userId: string, params: z.infer<typeof FindFreeSlotsSchema>) {
  try {
    const calendar = await getGoogleCalendarClient(params.accountId, userId);

    // Get busy times using freeBusy query
    const freeBusy = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        items: params.calendarIds.map((id) => ({ id })),
      },
    });

    const busyPeriods: Array<{ start: string; end: string }> = [];

    // Collect all busy periods
    Object.values(freeBusy.data.calendars || {}).forEach((cal) => {
      cal.busy?.forEach((period) => {
        if (period.start && period.end) {
          busyPeriods.push({
            start: period.start,
            end: period.end,
          });
        }
      });
    });

    // Sort busy periods by start time
    busyPeriods.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Find free slots
    const freeSlots: Array<{ start: string; end: string; duration: number }> = [];
    let currentTime = new Date(params.timeMin);
    const endTime = new Date(params.timeMax);
    const durationMs = params.duration * 60 * 1000;

    while (currentTime < endTime) {
      // Check working hours if specified
      if (params.workingHours) {
        const hour = currentTime.getHours();
        if (hour < params.workingHours.start || hour >= params.workingHours.end) {
          currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000); // Skip 1 hour
          continue;
        }
      }

      // Check if current time is in a busy period
      const isBusy = busyPeriods.some((period) => {
        const periodStart = new Date(period.start);
        const periodEnd = new Date(period.end);
        return currentTime >= periodStart && currentTime < periodEnd;
      });

      if (!isBusy) {
        // Check if we have enough continuous free time
        const slotEnd = new Date(currentTime.getTime() + durationMs);

        const hasConflict = busyPeriods.some((period) => {
          const periodStart = new Date(period.start);
          return periodStart > currentTime && periodStart < slotEnd;
        });

        if (!hasConflict && slotEnd <= endTime) {
          freeSlots.push({
            start: currentTime.toISOString(),
            end: slotEnd.toISOString(),
            duration: params.duration,
          });
        }
      }

      // Move to next potential slot (15 min increments)
      currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
    }

    logger.info(
      `Found ${freeSlots.length} free slots`,
      { userId, accountId: params.accountId },
      LOG_SOURCE
    );

    return {
      freeSlots,
      busyPeriods,
    };
  } catch (error) {
    logger.error(
      "Failed to find free slots",
      { userId, error: error instanceof Error ? error.message : "Unknown" },
      LOG_SOURCE
    );
    throw error;
  }
}
