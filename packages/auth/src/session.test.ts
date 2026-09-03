import { canReadMemberData } from "@inept/db";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import {
  accessContextFor,
  hasRole,
  holdsAnyRole,
  isFullMember,
  loadUserRoles,
  toViewer,
} from "./session.js";

const VIEWER = {
  id: "u1",
  email: "a@example.com",
  name: "A",
  membershipLevel: "member" as const,
  roles: ["kitchen" as const],
};

describe("viewer helpers", () => {
  it("reports roles the viewer holds", () => {
    expect(hasRole(VIEWER, "kitchen")).toBe(true);
    expect(hasRole(VIEWER, "medical")).toBe(false);
    expect(hasRole(VIEWER, "medical", "kitchen")).toBe(true);
  });

  it("treats a missing viewer as holding nothing", () => {
    expect(hasRole(undefined, "kitchen")).toBe(false);
    expect(holdsAnyRole(undefined)).toBe(false);
    expect(isFullMember(undefined)).toBe(false);
  });

  it("distinguishes a foe from a full member", () => {
    expect(isFullMember(VIEWER)).toBe(true);
    expect(isFullMember({ ...VIEWER, membershipLevel: "foe" })).toBe(false);
  });

  it("produces an empty access context when signed out", () => {
    expect(accessContextFor(undefined)).toEqual({});
  });

  /** Confirms the auth layer and the database policy actually agree. */
  it("feeds the member data policy correctly", () => {
    const context = accessContextFor(VIEWER);

    expect(canReadMemberData("dietary", "someone-else", context)).toBe(true);
    expect(canReadMemberData("medical", "someone-else", context)).toBe(false);
    expect(
      canReadMemberData("emergencyContacts", "someone-else", context),
    ).toBe(false);
    // Always able to read their own, whatever roles they hold.
    expect(canReadMemberData("medical", VIEWER.id, context)).toBe(true);
  });
});

// Integration coverage against a real database.
const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("loadUserRoles", () => {
  afterAll(async () => {
    const { closeDb } = await import("@inept/db");
    await closeDb();
  });

  it("reads roles back from the database into a viewer", async () => {
    const { getDb, users, userRoles } = await import("@inept/db");
    const db = getDb();
    const id = `test-session-${Date.now()}`;

    await db.insert(users).values({
      id,
      name: "Officer Sister",
      email: `${id}@example.com`,
      membershipLevel: "member",
    });
    await db.insert(userRoles).values([
      { userId: id, role: "sister" },
      { userId: id, role: "officer" },
    ]);

    expect((await loadUserRoles(id, db)).sort()).toEqual(["officer", "sister"]);

    const viewer = await toViewer(
      {
        user: {
          id,
          email: `${id}@example.com`,
          name: "Officer Sister",
          membershipLevel: "member",
        },
      },
      db,
    );
    expect(viewer.roles.sort()).toEqual(["officer", "sister"]);
    expect(
      canReadMemberData("emergencyContacts", "other", accessContextFor(viewer)),
    ).toBe(true);
    expect(
      canReadMemberData("medical", "other", accessContextFor(viewer)),
    ).toBe(false);

    await db.delete(users).where(eq(users.id, id));
  });

  it("returns no roles for a brand new foe", async () => {
    const { getDb, users } = await import("@inept/db");
    const db = getDb();
    const id = `test-foe-${Date.now()}`;

    await db
      .insert(users)
      .values({ id, name: "New", email: `${id}@example.com` });
    expect(await loadUserRoles(id, db)).toEqual([]);

    await db.delete(users).where(eq(users.id, id));
  });
});
