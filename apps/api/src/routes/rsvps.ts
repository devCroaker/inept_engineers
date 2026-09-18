import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  AttendeeListSchema,
  ErrorSchema,
  EventSchema,
  EventIdParamSchema,
  UpsertRsvpSchema,
} from "@inept/api-contract";
import { accessContextFor } from "@inept/auth";
import {
  canViewUnpublishedEvents,
  events,
  getDb,
  profiles,
  rsvps,
  users,
} from "@inept/db";
import { eq } from "drizzle-orm";

import { errorBody } from "../lib/errors.js";
import { newId, summariseAttendance, toEventDto } from "../lib/events.js";
import { type AppEnv, requireViewer, viewerOf } from "../lib/session.js";

const jsonError = (description: string) => ({
  content: { "application/json": { schema: ErrorSchema } },
  description,
});

const upsertRsvp = createRoute({
  method: "put",
  path: "/events/{id}/rsvp",
  tags: ["Events"],
  summary: "Create or change your own RSVP",
  description:
    "Idempotent: one RSVP exists per member per event, so changing your mind updates it rather " +
    "than adding another. Any signed-in member may RSVP, including a Friend of Engineers.",
  security: [{ sessionCookie: [] }],
  middleware: [requireViewer] as const,
  request: {
    params: EventIdParamSchema,
    body: {
      content: { "application/json": { schema: UpsertRsvpSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: EventSchema } },
      description: "The event, including your updated RSVP.",
    },
    401: jsonError("Not signed in."),
    404: jsonError("No such event."),
    409: jsonError("The event is cancelled, or it has already finished."),
  },
});

const listAttendees = createRoute({
  method: "get",
  path: "/events/{id}/rsvps",
  tags: ["Events"],
  summary: "Who is coming",
  description:
    "Visible to any signed-in member, since knowing who is attending is the point. Contains no " +
    "contact, dietary, or medical information; those have narrower audiences and their own endpoints.",
  security: [{ sessionCookie: [] }],
  middleware: [requireViewer] as const,
  request: { params: EventIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: AttendeeListSchema } },
      description: "Everyone who has responded.",
    },
    401: jsonError("Not signed in."),
    404: jsonError("No such event."),
  },
});

export const rsvpsRouter = new OpenAPIHono<AppEnv>()
  .openapi(upsertRsvp, async (c) => {
    const viewer = viewerOf(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = getDb();

    const event = await db.query.events.findFirst({
      where: eq(events.id, id),
    });
    if (
      !event ||
      // Only drafts are hidden. A cancelled event was already announced, so
      // reporting it as missing would tell a member who had RSVPd that it
      // never existed, rather than that it is off.
      (event.status === "draft" &&
        !canViewUnpublishedEvents(accessContextFor(viewer)))
    ) {
      return c.json(errorBody("not_found", `No event with id "${id}".`), 404);
    }

    if (event.status === "cancelled") {
      return c.json(errorBody("conflict", "That event is cancelled."), 409);
    }

    const finishedAt = event.endsAt ?? event.startsAt;
    if (finishedAt < new Date()) {
      return c.json(
        errorBody("conflict", "That event has already finished."),
        409,
      );
    }

    const values = {
      status: body.status,
      arrivalDate: body.arrivalDate ?? null,
      departureDate: body.departureDate ?? null,
      guestCount: body.guestCount,
      notes: body.notes ?? null,
      updatedAt: new Date(),
    };

    // The unique index on (event_id, user_id) makes this a genuine upsert, so
    // two rapid submissions cannot create a duplicate RSVP.
    await db
      .insert(rsvps)
      .values({
        id: newId("rsvp"),
        eventId: event.id,
        userId: viewer.id,
        ...values,
      })
      .onConflictDoUpdate({
        target: [rsvps.eventId, rsvps.userId],
        set: values,
      });

    const forEvent = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.eventId, event.id));

    return c.json(
      toEventDto(
        event,
        summariseAttendance(forEvent),
        forEvent.find((r) => r.userId === viewer.id),
      ),
      200,
    );
  })

  .openapi(listAttendees, async (c) => {
    const viewer = viewerOf(c);
    const { id } = c.req.valid("param");
    const db = getDb();

    const event = await db.query.events.findFirst({
      where: eq(events.id, id),
    });
    if (
      !event ||
      // Only drafts are hidden. A cancelled event was already announced, so
      // reporting it as missing would tell a member who had RSVPd that it
      // never existed, rather than that it is off.
      (event.status === "draft" &&
        !canViewUnpublishedEvents(accessContextFor(viewer)))
    ) {
      return c.json(errorBody("not_found", `No event with id "${id}".`), 404);
    }

    // Only the columns the roster needs. Nothing from member_contact,
    // member_dietary, or member_medical is joined here, so none of it can leak
    // through this endpoint by accident.
    const rows = await db
      .select({
        userId: rsvps.userId,
        name: users.name,
        scaName: profiles.scaName,
        status: rsvps.status,
        arrivalDate: rsvps.arrivalDate,
        departureDate: rsvps.departureDate,
        guestCount: rsvps.guestCount,
        notes: rsvps.notes,
      })
      .from(rsvps)
      .innerJoin(users, eq(rsvps.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(rsvps.eventId, event.id))
      .orderBy(rsvps.status, users.name);

    return c.json({ items: rows, total: rows.length }, 200);
  });
