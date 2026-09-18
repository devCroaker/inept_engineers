import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  CreateEventSchema,
  ErrorSchema,
  EventListQuerySchema,
  EventListSchema,
  EventSchema,
  EventIdParamSchema,
  UpdateEventSchema,
} from "@inept/api-contract";
import { accessContextFor } from "@inept/auth";
import {
  canManageEvents,
  canViewUnpublishedEvents,
  events,
  getDb,
  rsvps,
} from "@inept/db";
import { and, asc, count, desc, eq, gte, inArray, lt } from "drizzle-orm";

import { newId, summariseAttendance, toEventDto } from "../lib/events.js";
import { ApiError, errorBody } from "../lib/errors.js";
import { type AppEnv, requireViewer, viewerOf } from "../lib/session.js";

const jsonError = (description: string) => ({
  content: { "application/json": { schema: ErrorSchema } },
  description,
});

const listEvents = createRoute({
  method: "get",
  path: "/events",
  tags: ["Events"],
  summary: "List events",
  description:
    "Upcoming published events by default. Drafts and cancelled events are only visible to " +
    "members who can manage events.",
  security: [{ sessionCookie: [] }],
  middleware: [requireViewer] as const,
  request: { query: EventListQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: EventListSchema } },
      description: "A page of events.",
    },
    401: jsonError("Not signed in."),
  },
});

const getEvent = createRoute({
  method: "get",
  path: "/events/{id}",
  tags: ["Events"],
  summary: "Fetch one event",
  security: [{ sessionCookie: [] }],
  middleware: [requireViewer] as const,
  request: { params: EventIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: EventSchema } },
      description: "The event.",
    },
    401: jsonError("Not signed in."),
    404: jsonError(
      "No such event, or it is not published and you cannot see drafts.",
    ),
  },
});

const createEvent = createRoute({
  method: "post",
  path: "/events",
  tags: ["Events"],
  summary: "Create an event",
  security: [{ sessionCookie: [] }],
  middleware: [requireViewer] as const,
  request: {
    body: {
      content: { "application/json": { schema: CreateEventSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: EventSchema } },
      description: "The created event.",
    },
    401: jsonError("Not signed in."),
    403: jsonError("You do not hold a role that can manage events."),
  },
});

const updateEvent = createRoute({
  method: "patch",
  path: "/events/{id}",
  tags: ["Events"],
  summary: "Update an event",
  security: [{ sessionCookie: [] }],
  middleware: [requireViewer] as const,
  request: {
    params: EventIdParamSchema,
    body: {
      content: { "application/json": { schema: UpdateEventSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: EventSchema } },
      description: "The updated event.",
    },
    401: jsonError("Not signed in."),
    403: jsonError("You do not hold a role that can manage events."),
    404: jsonError("No such event."),
  },
});

export const eventsRouter = new OpenAPIHono<AppEnv>()
  .openapi(listEvents, async (c) => {
    const viewer = viewerOf(c);
    const { limit, offset, status, when } = c.req.valid("query");
    const db = getDb();
    const canSeeDrafts = canViewUnpublishedEvents(accessContextFor(viewer));

    const now = new Date();
    const filters = [
      // Members only ever see published events. Asking for another status is
      // not an error, it simply matches nothing for them.
      canSeeDrafts
        ? status
          ? eq(events.status, status)
          : undefined
        : // Members see what was announced, including cancellations, but never drafts.
          inArray(events.status, ["published", "cancelled"]),
      status && !canSeeDrafts ? eq(events.status, status) : undefined,
      when === "upcoming" ? gte(events.startsAt, now) : undefined,
      when === "past" ? lt(events.startsAt, now) : undefined,
    ].filter((clause) => clause !== undefined);

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, [totals]] = await Promise.all([
      db
        .select()
        .from(events)
        .where(where)
        .orderBy(when === "past" ? desc(events.startsAt) : asc(events.startsAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(events).where(where),
    ]);

    // One query for every RSVP on this page, rather than one per event.
    const eventIds = rows.map((row) => row.id);
    const allRsvps = eventIds.length
      ? await db.select().from(rsvps).where(inArray(rsvps.eventId, eventIds))
      : [];

    const items = rows.map((event) => {
      const forEvent = allRsvps.filter((r) => r.eventId === event.id);
      return toEventDto(
        event,
        summariseAttendance(forEvent),
        forEvent.find((r) => r.userId === viewer.id),
      );
    });

    return c.json({ items, total: totals?.value ?? 0, limit, offset }, 200);
  })

  .openapi(getEvent, async (c) => {
    const viewer = viewerOf(c);
    const { id } = c.req.valid("param");
    const db = getDb();

    const event = await db.query.events.findFirst({
      where: eq(events.id, id),
    });

    // A draft is reported as missing rather than forbidden, so its existence is
    // not leaked to members who should not know about it yet.
    // Only drafts are hidden. A cancelled event stays visible so members can
    // see it is off rather than being told it never existed.
    if (
      !event ||
      (event.status === "draft" &&
        !canViewUnpublishedEvents(accessContextFor(viewer)))
    ) {
      return c.json(errorBody("not_found", `No event with id "${id}".`), 404);
    }

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

  .openapi(createEvent, async (c) => {
    const viewer = viewerOf(c);
    if (!canManageEvents(accessContextFor(viewer))) {
      return c.json(errorBody("forbidden", "You cannot create events."), 403);
    }

    const body = c.req.valid("json");
    const db = getDb();

    // No uniqueness to check: the id is generated here, so two events with the
    // same title are simply two events.
    const [created] = await db
      .insert(events)
      .values({
        ...body,
        id: newId("evt"),
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        createdBy: viewer.id,
      })
      .returning();

    if (!created) {
      throw new ApiError("internal_error", "Insert returned no row.");
    }

    return c.json(toEventDto(created, summariseAttendance([]), undefined), 201);
  })

  .openapi(updateEvent, async (c) => {
    const viewer = viewerOf(c);
    if (!canManageEvents(accessContextFor(viewer))) {
      return c.json(errorBody("forbidden", "You cannot edit events."), 403);
    }

    const { id } = c.req.valid("param");
    const { startsAt, endsAt, ...rest } = c.req.valid("json");
    const db = getDb();

    const event = await db.query.events.findFirst({
      where: eq(events.id, id),
    });
    if (!event) {
      return c.json(errorBody("not_found", `No event with id "${id}".`), 404);
    }

    const [updated] = await db
      .update(events)
      .set({
        ...rest,
        ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
        ...(endsAt !== undefined
          ? { endsAt: endsAt ? new Date(endsAt) : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(events.id, event.id))
      .returning();

    if (!updated) {
      throw new ApiError("internal_error", "Update returned no row.");
    }

    const forEvent = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.eventId, updated.id));

    return c.json(
      toEventDto(
        updated,
        summariseAttendance(forEvent),
        forEvent.find((r) => r.userId === viewer.id),
      ),
      200,
    );
  });
