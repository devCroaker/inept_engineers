import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.BETTER_AUTH_SECRET ??= "test-secret-not-used-anywhere-real";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "postgresql://inept:localdev@localhost:5433/inept";
process.env.GOOGLE_CLIENT_ID ??= "test-google-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-google-secret";
process.env.DISCORD_CLIENT_ID ??= "test-discord-id";
process.env.DISCORD_CLIENT_SECRET ??= "test-discord-secret";

const { createRootApp } = await import("../app.js");
const { closeDb, events, getDb } = await import("@inept/db");
const { createSignedInMember, jsonHeaders } =
  await import("../test-support.js");

const hasDb = Boolean(process.env.DATABASE_URL);
const app = createRootApp();

describe.runIf(hasDb)("events API", () => {
  let captain: Awaited<ReturnType<typeof createSignedInMember>>;
  let member: Awaited<ReturnType<typeof createSignedInMember>>;
  const slug = `autumn-war-${Date.now()}`;

  beforeAll(async () => {
    captain = await createSignedInMember(app, {
      name: "Captain",
      roles: ["captain"],
    });
    member = await createSignedInMember(app, { name: "Plain Member" });
  });

  afterAll(async () => {
    await getDb().delete(events).where(eq(events.slug, slug));
    await captain.cleanup();
    await member.cleanup();
    await closeDb();
  });

  const future = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString();

  it("refuses the whole surface when signed out", async () => {
    for (const path of [
      "/api/events",
      "/api/events/x",
      "/api/events/x/rsvps",
    ]) {
      expect((await app.request(path)).status, path).toBe(401);
    }
  });

  it("tells each viewer what they may do, so the UI need not guess", async () => {
    const read = async (cookie: string) => {
      const res = await app.request("/api/me", { headers: { cookie } });
      return (await res.json()) as {
        can: { manageEvents: boolean; rsvp: boolean };
      };
    };

    expect((await read(captain.cookie)).can).toEqual({
      manageEvents: true,
      rsvp: true,
    });
    // A foe may still RSVP: turning up is how someone gets sponsored.
    expect((await read(member.cookie)).can).toEqual({
      manageEvents: false,
      rsvp: true,
    });
  });

  it("lets a captain create an event", async () => {
    const res = await app.request("/api/events", {
      method: "POST",
      headers: { ...jsonHeaders, cookie: captain.cookie },
      body: JSON.stringify({
        slug,
        title: "Autumn War",
        kind: "camping",
        startsAt: future(30),
        endsAt: future(33),
        location: "The usual field",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      status: string;
      attendance: { yes: number };
    };
    expect(body.status).toBe("draft");
    expect(body.attendance.yes).toBe(0);
  });

  it("refuses to let a plain member create an event", async () => {
    const res = await app.request("/api/events", {
      method: "POST",
      headers: { ...jsonHeaders, cookie: member.cookie },
      body: JSON.stringify({
        slug: `nope-${Date.now()}`,
        title: "Nope",
        startsAt: future(10),
      }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: "forbidden" } });
  });

  it("hides a draft from members, and reports it as missing rather than forbidden", async () => {
    // Reporting 404 keeps the existence of an unannounced event private.
    expect(
      (
        await app.request(`/api/events/${slug}`, {
          headers: { cookie: member.cookie },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await app.request(`/api/events/${slug}`, {
          headers: { cookie: captain.cookie },
        })
      ).status,
    ).toBe(200);
  });

  it("omits drafts from the member listing but shows them to a captain", async () => {
    const asMember = (await (
      await app.request("/api/events", { headers: { cookie: member.cookie } })
    ).json()) as { items: { slug: string }[] };
    expect(asMember.items.map((e) => e.slug)).not.toContain(slug);

    const asCaptain = (await (
      await app.request("/api/events", { headers: { cookie: captain.cookie } })
    ).json()) as { items: { slug: string }[] };
    expect(asCaptain.items.map((e) => e.slug)).toContain(slug);
  });

  it("refuses an RSVP to an event the member cannot see", async () => {
    const res = await app.request(`/api/events/${slug}/rsvp`, {
      method: "PUT",
      headers: { ...jsonHeaders, cookie: member.cookie },
      body: JSON.stringify({ status: "yes", guestCount: 0 }),
    });
    expect(res.status).toBe(404);
  });

  it("publishes, then accepts an RSVP and counts guests", async () => {
    const published = await app.request(`/api/events/${slug}`, {
      method: "PATCH",
      headers: { ...jsonHeaders, cookie: captain.cookie },
      body: JSON.stringify({ status: "published" }),
    });
    expect(published.status).toBe(200);

    const res = await app.request(`/api/events/${slug}/rsvp`, {
      method: "PUT",
      headers: { ...jsonHeaders, cookie: member.cookie },
      body: JSON.stringify({
        status: "yes",
        guestCount: 2,
        notes: "Arriving late Friday.",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      attendance: { yes: number; expectedHeadcount: number };
      viewerRsvp: { status: string; guestCount: number } | null;
    };
    expect(body.attendance.yes).toBe(1);
    // One member plus two guests.
    expect(body.attendance.expectedHeadcount).toBe(3);
    expect(body.viewerRsvp).toMatchObject({ status: "yes", guestCount: 2 });
  });

  it("updates the existing RSVP rather than creating a second", async () => {
    const res = await app.request(`/api/events/${slug}/rsvp`, {
      method: "PUT",
      headers: { ...jsonHeaders, cookie: member.cookie },
      body: JSON.stringify({ status: "maybe", guestCount: 0 }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      attendance: { yes: number; maybe: number };
    };
    expect(body.attendance.yes).toBe(0);
    expect(body.attendance.maybe).toBe(1);
  });

  it("lists attendees without any sensitive member data", async () => {
    const res = await app.request(`/api/events/${slug}/rsvps`, {
      headers: { cookie: member.cookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      items: Record<string, unknown>[];
      total: number;
    };
    expect(body.total).toBe(1);

    // The roster must never carry contact, dietary, or medical fields; those
    // have narrower audiences and their own endpoints.
    const forbidden = [
      "legalName",
      "phone",
      "allergies",
      "dietaryRestrictions",
      "medications",
      "conditions",
      "emergencyContact",
      "accessibilityNotes",
    ];
    const serialised = JSON.stringify(body);
    for (const field of forbidden) {
      expect(serialised, field).not.toContain(field);
    }
  });

  it("refuses an RSVP to a cancelled event", async () => {
    await app.request(`/api/events/${slug}`, {
      method: "PATCH",
      headers: { ...jsonHeaders, cookie: captain.cookie },
      body: JSON.stringify({ status: "cancelled" }),
    });

    const res = await app.request(`/api/events/${slug}/rsvp`, {
      method: "PUT",
      headers: { ...jsonHeaders, cookie: member.cookie },
      body: JSON.stringify({ status: "yes", guestCount: 0 }),
    });
    expect(res.status).toBe(409);
  });
});

describe("attendance summary", () => {
  it("counts guests but excludes maybes from the headcount", async () => {
    const { summariseAttendance } = await import("../lib/events.js");

    expect(
      summariseAttendance([
        { status: "yes", guestCount: 2 },
        { status: "yes", guestCount: 0 },
        { status: "maybe", guestCount: 5 },
        { status: "no", guestCount: 0 },
      ]),
    ).toEqual({ yes: 2, maybe: 1, no: 1, expectedHeadcount: 4 });
  });
});
