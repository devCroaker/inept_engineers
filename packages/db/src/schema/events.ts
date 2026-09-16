import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { users } from "./auth.js";

/**
 * The kinds of thing the household puts on. Stored as text with a check
 * constraint rather than a Postgres enum, matching how roles are handled, so
 * adding a kind is a migration widening the constraint rather than an enum
 * alteration.
 */
export const EVENT_KINDS = [
  "camping",
  "party",
  "day_event",
  "practice",
  "meeting",
  "other",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_STATUSES = ["draft", "published", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

const eventKindValues = EVENT_KINDS.map((k) => `'${k}'`).join(", ");
const eventStatusValues = EVENT_STATUSES.map((s) => `'${s}'`).join(", ");

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    /** Markdown. Rendered on the event page. */
    description: text("description"),
    kind: text("kind").$type<EventKind>().notNull().default("other"),
    status: text("status").$type<EventStatus>().notNull().default("draft"),

    /**
     * Timestamps rather than dates, because a party starts at a time while a
     * camping event effectively starts on a day. Storing the more precise type
     * lets both work; the UI decides how much of it to show.
     */
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),

    location: text("location"),
    address: text("address"),

    /**
     * Official SCA registration lives elsewhere, for example a kingdom system.
     * This site coordinates attendance and the camp food buy-in; it never takes
     * event fees, so events that have them link out instead.
     */
    externalRegistrationUrl: text("external_registration_url"),

    /** Null means no cap. */
    capacity: integer("capacity"),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("events_slug_idx").on(table.slug),
    // Drives the main listing: published events, soonest first.
    index("events_status_starts_at_idx").on(table.status, table.startsAt),
    check("events_kind_valid", sql.raw(`kind in (${eventKindValues})`)),
    check("events_status_valid", sql.raw(`status in (${eventStatusValues})`)),
    check(
      "events_ends_after_starts",
      sql`ends_at is null or ends_at >= starts_at`,
    ),
  ],
);

export const RSVP_STATUSES = ["yes", "no", "maybe"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

const rsvpStatusValues = RSVP_STATUSES.map((s) => `'${s}'`).join(", ");

/**
 * One row per member per event.
 *
 * Attendance for multi-day events is expressed as an arrival and departure
 * date rather than a row per day. Per-night headcounts, which is what site
 * fees and meal planning actually need, are derivable from the range, and a
 * range matches how people describe it: "Friday night through Sunday". A
 * separate table would only earn its keep for genuinely non-contiguous
 * attendance, which is rare enough to not be worth the complexity now.
 */
export const rsvps = pgTable(
  "rsvps",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").$type<RsvpStatus>().notNull(),

    /** Both null for single-day events, where the event dates are enough. */
    arrivalDate: date("arrival_date"),
    departureDate: date("departure_date"),

    /** Non-member companions the member is bringing. */
    guestCount: integer("guest_count").notNull().default(0),

    /** Anything the organizers should know, for example "arriving late". */
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One RSVP per member per event; changing your mind updates the row.
    uniqueIndex("rsvps_event_user_idx").on(table.eventId, table.userId),
    index("rsvps_event_status_idx").on(table.eventId, table.status),
    check("rsvps_status_valid", sql.raw(`status in (${rsvpStatusValues})`)),
    check("rsvps_guest_count_non_negative", sql`guest_count >= 0`),
    check(
      "rsvps_departure_after_arrival",
      sql`departure_date is null or arrival_date is null or departure_date >= arrival_date`,
    ),
  ],
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, { fields: [events.createdBy], references: [users.id] }),
  rsvps: many(rsvps),
}));

export const rsvpsRelations = relations(rsvps, ({ one }) => ({
  event: one(events, { fields: [rsvps.eventId], references: [events.id] }),
  user: one(users, { fields: [rsvps.userId], references: [users.id] }),
}));

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Rsvp = typeof rsvps.$inferSelect;
export type NewRsvp = typeof rsvps.$inferInsert;
