import { z } from "@hono/zod-openapi";

export const EventKindSchema = z
  .enum(["camping", "party", "day_event", "practice", "meeting", "other"])
  .openapi("EventKind");

export const EventStatusSchema = z
  .enum(["draft", "published", "cancelled"])
  .openapi("EventStatus");

export const RsvpStatusSchema = z
  .enum(["yes", "no", "maybe"])
  .openapi("RsvpStatus");

/** Counts shown alongside an event so the list is useful without loading every RSVP. */
export const AttendanceSummarySchema = z
  .object({
    yes: z.number().int(),
    maybe: z.number().int(),
    no: z.number().int(),
    /** Members saying yes, plus the guests they are bringing. */
    expectedHeadcount: z.number().int(),
  })
  .openapi("AttendanceSummary");

export const EventSchema = z
  .object({
    id: z.string(),
    slug: z.string().openapi({ example: "autumn-war" }),
    title: z.string().openapi({ example: "Autumn War" }),
    description: z.string().nullable(),
    kind: EventKindSchema,
    status: EventStatusSchema,
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().nullable(),
    location: z.string().nullable(),
    address: z.string().nullable(),
    /** Official SCA registration, when the event has fees this site does not take. */
    externalRegistrationUrl: z.url().nullable(),
    capacity: z.number().int().nullable(),
    attendance: AttendanceSummarySchema,
    /** The signed-in member's own RSVP, when they have one. */
    viewerRsvp: z
      .object({
        status: RsvpStatusSchema,
        arrivalDate: z.iso.date().nullable(),
        departureDate: z.iso.date().nullable(),
        guestCount: z.number().int(),
        notes: z.string().nullable(),
      })
      .nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi("Event");

export const EventListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: EventStatusSchema.optional(),
  /** Defaults to upcoming only, which is what a listing almost always wants. */
  when: z.enum(["upcoming", "past", "all"]).default("upcoming"),
});

export const EventListSchema = z
  .object({
    items: z.array(EventSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("EventList");

export const CreateEventSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Must be a lowercase hyphenated slug",
      ),
    title: z.string().min(1),
    description: z.string().nullish(),
    kind: EventKindSchema.default("other"),
    status: EventStatusSchema.default("draft"),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().nullish(),
    location: z.string().nullish(),
    address: z.string().nullish(),
    externalRegistrationUrl: z.url().nullish(),
    capacity: z.number().int().positive().nullish(),
  })
  .openapi("CreateEvent");

export const UpdateEventSchema = CreateEventSchema.partial()
  .omit({ slug: true })
  .openapi("UpdateEvent");

export const UpsertRsvpSchema = z
  .object({
    status: RsvpStatusSchema,
    arrivalDate: z.iso.date().nullish(),
    departureDate: z.iso.date().nullish(),
    guestCount: z.number().int().min(0).default(0),
    notes: z.string().nullish(),
  })
  .openapi("UpsertRsvp");

/** One row of the attendance roster. */
export const AttendeeSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    scaName: z.string().nullable(),
    status: RsvpStatusSchema,
    arrivalDate: z.iso.date().nullable(),
    departureDate: z.iso.date().nullable(),
    guestCount: z.number().int(),
    notes: z.string().nullable(),
  })
  .openapi("Attendee");

export const AttendeeListSchema = z
  .object({ items: z.array(AttendeeSchema), total: z.number().int() })
  .openapi("AttendeeList");

export const EventSlugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .openapi({ param: { name: "slug", in: "path" }, example: "autumn-war" }),
});

export type Event = z.infer<typeof EventSchema>;
export type CreateEvent = z.infer<typeof CreateEventSchema>;
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;
export type UpsertRsvp = z.infer<typeof UpsertRsvpSchema>;
export type Attendee = z.infer<typeof AttendeeSchema>;
