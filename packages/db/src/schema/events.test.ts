import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client.js";
import { events, rsvps } from "./events.js";
import { users } from "./auth.js";

const hasDb = Boolean(process.env.DATABASE_URL);

/** Returns the rejected error, or undefined when the insert unexpectedly succeeded. */
async function rejection(
  promise: Promise<unknown>,
): Promise<{ constraint?: string } | undefined> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  return (error as { cause?: { constraint?: string } } | undefined)?.cause;
}

describe.runIf(hasDb)("events and rsvps", () => {
  const suffix = Date.now();
  const organizerId = `test-organizer-${suffix}`;
  const memberId = `test-member-${suffix}`;
  const eventId = `test-event-${suffix}`;

  beforeAll(async () => {
    const db = getDb();
    await db.insert(users).values([
      {
        id: organizerId,
        name: "Organizer",
        email: `${organizerId}@example.com`,
      },
      { id: memberId, name: "Member", email: `${memberId}@example.com` },
    ]);
  });

  afterAll(async () => {
    const db = getDb();
    // The event must go first and explicitly: deleting its creator only nulls
    // created_by, by design, so the event would otherwise survive the run.
    await db.delete(events).where(eq(events.id, eventId));
    await db.delete(users).where(eq(users.id, organizerId));
    await db.delete(users).where(eq(users.id, memberId));
    await closeDb();
  });

  it("creates an event that defaults to draft", async () => {
    const db = getDb();
    const [created] = await db
      .insert(events)
      .values({
        id: eventId,
        slug: `autumn-war-${suffix}`,
        title: "Autumn War",
        kind: "camping",
        startsAt: new Date("2026-10-01T16:00:00Z"),
        endsAt: new Date("2026-10-04T12:00:00Z"),
        createdBy: organizerId,
      })
      .returning();

    // Drafts are invisible to members until an organizer publishes them.
    expect(created?.status).toBe("draft");
    expect(created?.kind).toBe("camping");
    expect(created?.capacity).toBeNull();
  });

  it("rejects an event that ends before it starts", async () => {
    const db = getDb();
    const cause = await rejection(
      db.insert(events).values({
        id: `bad-dates-${suffix}`,
        slug: `bad-dates-${suffix}`,
        title: "Time Travel",
        startsAt: new Date("2026-10-04T12:00:00Z"),
        endsAt: new Date("2026-10-01T16:00:00Z"),
      }),
    );
    expect(cause?.constraint).toBe("events_ends_after_starts");
  });

  it("rejects an unknown event kind", async () => {
    const db = getDb();
    const cause = await rejection(
      db.insert(events).values({
        id: `bad-kind-${suffix}`,
        slug: `bad-kind-${suffix}`,
        title: "Mystery",
        kind: "tournament" as unknown as "camping",
        startsAt: new Date("2026-10-01T16:00:00Z"),
      }),
    );
    expect(cause?.constraint).toBe("events_kind_valid");
  });

  it("records an RSVP with an attendance range and guests", async () => {
    const db = getDb();
    const [rsvp] = await db
      .insert(rsvps)
      .values({
        id: `rsvp-${suffix}`,
        eventId,
        userId: memberId,
        status: "yes",
        arrivalDate: "2026-10-02",
        departureDate: "2026-10-04",
        guestCount: 2,
        notes: "Arriving after dark on Friday.",
      })
      .returning();

    expect(rsvp?.status).toBe("yes");
    expect(rsvp?.guestCount).toBe(2);
    expect(rsvp?.arrivalDate).toBe("2026-10-02");
  });

  it("allows only one RSVP per member per event", async () => {
    const db = getDb();
    const cause = await rejection(
      db.insert(rsvps).values({
        id: `rsvp-dup-${suffix}`,
        eventId,
        userId: memberId,
        status: "maybe",
      }),
    );
    // Changing your mind updates the existing row rather than adding another.
    expect(cause?.constraint).toBe("rsvps_event_user_idx");
  });

  it("rejects a departure before arrival", async () => {
    const db = getDb();
    const cause = await rejection(
      db.insert(rsvps).values({
        id: `rsvp-bad-range-${suffix}`,
        eventId,
        userId: organizerId,
        status: "yes",
        arrivalDate: "2026-10-04",
        departureDate: "2026-10-02",
      }),
    );
    expect(cause?.constraint).toBe("rsvps_departure_after_arrival");
  });

  it("rejects a negative guest count", async () => {
    const db = getDb();
    const cause = await rejection(
      db.insert(rsvps).values({
        id: `rsvp-bad-guests-${suffix}`,
        eventId,
        userId: organizerId,
        status: "yes",
        guestCount: -1,
      }),
    );
    expect(cause?.constraint).toBe("rsvps_guest_count_non_negative");
  });

  it("removes RSVPs when the event is deleted", async () => {
    const db = getDb();
    const throwaway = `cascade-${suffix}`;

    await db.insert(events).values({
      id: throwaway,
      slug: throwaway,
      title: "Cancelled Thing",
      startsAt: new Date("2026-11-01T18:00:00Z"),
    });
    await db.insert(rsvps).values({
      id: `${throwaway}-rsvp`,
      eventId: throwaway,
      userId: memberId,
      status: "yes",
    });

    await db.delete(events).where(eq(events.id, throwaway));

    expect(
      await db.select().from(rsvps).where(eq(rsvps.eventId, throwaway)),
    ).toHaveLength(0);
  });

  it("keeps the event when its creator is deleted", async () => {
    const db = getDb();
    const orphanOrganizer = `gone-${suffix}`;
    const orphanEvent = `orphan-${suffix}`;

    await db.insert(users).values({
      id: orphanOrganizer,
      name: "Departing",
      email: `${orphanOrganizer}@example.com`,
    });
    await db.insert(events).values({
      id: orphanEvent,
      slug: orphanEvent,
      title: "Still Happening",
      startsAt: new Date("2026-12-01T18:00:00Z"),
      createdBy: orphanOrganizer,
    });

    await db.delete(users).where(eq(users.id, orphanOrganizer));

    // The event outlives whoever created it; only the attribution is lost.
    const [survivor] = await db
      .select()
      .from(events)
      .where(eq(events.id, orphanEvent));
    expect(survivor?.title).toBe("Still Happening");
    expect(survivor?.createdBy).toBeNull();

    await db.delete(events).where(eq(events.id, orphanEvent));
  });
});
