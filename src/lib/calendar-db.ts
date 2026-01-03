import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, calendarEvents } from "@/db";

import {
  AttendeeStatus,
  CalendarEventWithFeed,
  EventStatus,
  ValidatedEvent,
} from "@/types/calendar";

export async function getEvent(
  eventId: string
): Promise<CalendarEventWithFeed | null> {
  const event = await db.query.calendarEvents.findFirst({
    where: (events, { eq }) => eq(events.id, eventId),
    with: { feed: true },
  });

  if (!event) return null;

  // Map Prisma result to our CalendarEventWithFeed type
  return {
    ...event,
    externalEventId: event.externalEventId || undefined,
    description: event.description || undefined,
    location: event.location || undefined,
    recurrenceRule: event.recurrenceRule || undefined,
    sequence: event.sequence || undefined,
    status: (event.status as EventStatus) || undefined,
    created: event.created || undefined,
    lastModified: event.lastModified || undefined,
    organizer: event.organizer as { name?: string; email?: string } | undefined,
    attendees: event.attendees as
      | Array<{ name?: string; email: string; status?: AttendeeStatus }>
      | undefined,
    masterEventId: event.masterEventId || undefined,
    recurringEventId: event.recurringEventId || undefined,
    feed: {
      ...event.feed,
      type: event.feed.type as "GOOGLE" | "OUTLOOK" | "CALDAV",
      url: event.feed.url || undefined,
      color: event.feed.color || undefined,
      lastSync: event.feed.lastSync || undefined,
      error: event.feed.error || undefined,
      caldavPath: event.feed.caldavPath || undefined,
      accountId: event.feed.accountId || undefined,
      syncToken: event.feed.syncToken || undefined,
      userId: event.feed.userId || undefined,
    },
  };
}

export async function validateEvent(
  event: CalendarEventWithFeed | null,
  provider: "GOOGLE" | "OUTLOOK" | "CALDAV"
): Promise<ValidatedEvent | NextResponse> {
  if (!event || !event.feed || !event.feed.accountId) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.feed.type !== provider) {
    return NextResponse.json(
      { error: `Not a ${provider} Calendar event` },
      { status: 400 }
    );
  }

  // For CalDAV, we need either a URL or a caldavPath
  if (provider === "CALDAV" && !event.feed.caldavPath && !event.feed.url) {
    return NextResponse.json(
      { error: "No CalDAV calendar path found" },
      { status: 400 }
    );
  } else if (provider !== "CALDAV" && !event.feed.url) {
    return NextResponse.json(
      { error: "No calendar URL found" },
      { status: 400 }
    );
  }

  if (!event.externalEventId) {
    return NextResponse.json(
      { error: `No ${provider} Calendar event ID found` },
      { status: 400 }
    );
  }

  return event as ValidatedEvent;
}

export async function deleteCalendarEvent(
  eventId: string,
  mode: "single" | "series" = "single"
) {
  const event = await getEvent(eventId);

  if (!event) {
    throw new Error("Event not found");
  }

  if (mode === "series") {
    // Delete the event and any related instances from our database
    if (event.isMaster || !event.masterEventId) {
      //deleting the master event will cascade to all instances
      await db.delete(calendarEvents).where(eq(calendarEvents.id, event.id));
    } else {
      const masterEvent = await db.query.calendarEvents.findFirst({
        where: (events, { eq }) => eq(events.id, event.masterEventId!),
      });
      //deleting the master event will cascade to all instances
      if (masterEvent?.id) {
        await db
          .delete(calendarEvents)
          .where(eq(calendarEvents.id, masterEvent.id));
      }
    }
  } else {
    //delete a single instance
    await db.delete(calendarEvents).where(eq(calendarEvents.id, event.id));
  }

  return event;
}
