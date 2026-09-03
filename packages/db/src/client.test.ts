import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "./client.js";
import {
  emergencyContacts,
  memberContact,
  memberDietary,
  memberMedical,
  profiles,
  userRoles,
  users,
} from "./schema/index.js";

// Integration coverage. Skipped when no database is reachable, so `pnpm test`
// still passes without Docker running.
const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("member data", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("defaults a new account to Friend of Engineers with no roles", async () => {
    const db = getDb();
    const id = `test-default-${Date.now()}`;

    const [created] = await db
      .insert(users)
      .values({ id, name: "New Face", email: `${id}@example.com` })
      .returning();

    expect(created?.membershipLevel).toBe("foe");
    expect(
      await db.select().from(userRoles).where(eq(userRoles.userId, id)),
    ).toHaveLength(0);

    await db.delete(users).where(eq(users.id, id));
  });

  it("stores a member across every access tier", async () => {
    const db = getDb();
    const id = `test-tiers-${Date.now()}`;

    await db.insert(users).values({
      id,
      name: "Test Member",
      email: `${id}@example.com`,
      membershipLevel: "member",
    });
    await db
      .insert(profiles)
      .values({ userId: id, scaName: "Wilhelm the Inept", city: "Portland" });
    await db
      .insert(memberContact)
      .values({ userId: id, legalName: "Will Smith", phone: "555-0100" });
    await db
      .insert(memberDietary)
      .values({ userId: id, allergies: "shellfish" });
    await db
      .insert(memberMedical)
      .values({ userId: id, medications: "insulin" });

    const found = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: { profile: true, contact: true, dietary: true, medical: true },
    });

    expect(found?.membershipLevel).toBe("member");
    expect(found?.profile?.scaName).toBe("Wilhelm the Inept");
    expect(found?.contact?.phone).toBe("555-0100");
    expect(found?.dietary?.allergies).toBe("shellfish");
    expect(found?.medical?.medications).toBe("insulin");

    await db.delete(users).where(eq(users.id, id));
  });

  it("holds several roles at once, including sister and officer together", async () => {
    const db = getDb();
    const id = `test-roles-${Date.now()}`;

    await db
      .insert(users)
      .values({ id, name: "Leader", email: `${id}@example.com` });
    await db.insert(userRoles).values([
      { userId: id, role: "sister" },
      { userId: id, role: "officer" },
      { userId: id, role: "kitchen" },
    ]);

    const held = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, id));
    expect(held.map((row) => row.role).sort()).toEqual([
      "kitchen",
      "officer",
      "sister",
    ]);

    await db.delete(users).where(eq(users.id, id));
  });

  it("orders emergency contacts by priority", async () => {
    const db = getDb();
    const id = `test-ec-${Date.now()}`;

    await db
      .insert(users)
      .values({ id, name: "Camper", email: `${id}@example.com` });
    await db.insert(emergencyContacts).values([
      {
        id: `${id}-b`,
        userId: id,
        name: "Second Call",
        phone: "555-0002",
        priority: 1,
      },
      {
        id: `${id}-a`,
        userId: id,
        name: "First Call",
        phone: "555-0001",
        priority: 0,
      },
    ]);

    const contacts = await db.query.emergencyContacts.findMany({
      where: eq(emergencyContacts.userId, id),
      orderBy: (table, { asc }) => [asc(table.priority)],
    });
    expect(contacts.map((c) => c.name)).toEqual(["First Call", "Second Call"]);

    await db.delete(users).where(eq(users.id, id));
  });

  it("cascades deletion so no sensitive row is orphaned", async () => {
    const db = getDb();
    const id = `test-cascade-${Date.now()}`;

    await db
      .insert(users)
      .values({ id, name: "Leaver", email: `${id}@example.com` });
    await db.insert(profiles).values({ userId: id });
    await db.insert(memberContact).values({ userId: id, phone: "555-0100" });
    await db.insert(memberDietary).values({ userId: id, allergies: "peanuts" });
    await db.insert(memberMedical).values({ userId: id, medications: "none" });
    await db.insert(userRoles).values({ userId: id, role: "kitchen" });
    await db
      .insert(emergencyContacts)
      .values({ id: `${id}-1`, userId: id, name: "Kin", phone: "555-0111" });

    await db.delete(users).where(eq(users.id, id));

    expect(
      await db.select().from(profiles).where(eq(profiles.userId, id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(memberContact).where(eq(memberContact.userId, id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(memberDietary).where(eq(memberDietary.userId, id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(memberMedical).where(eq(memberMedical.userId, id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(userRoles).where(eq(userRoles.userId, id)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(emergencyContacts)
        .where(eq(emergencyContacts.userId, id)),
    ).toHaveLength(0);
  });

  it("rejects a membership level outside the allowed set", async () => {
    const db = getDb();
    const id = `test-level-${Date.now()}`;

    // Drizzle wraps driver errors, so the constraint name is on the cause.
    const error = await db
      .insert(users)
      .values({
        id,
        name: "Impostor",
        email: `${id}@example.com`,
        // Cast past the type deliberately, to prove the database constraint
        // holds even when application code gets it wrong.
        membershipLevel: "grandmaster" as unknown as "member",
      })
      .then(
        () => undefined,
        (reason: unknown) => reason,
      );

    const cause = (error as { cause?: { constraint?: string } } | undefined)
      ?.cause;
    expect(cause?.constraint).toBe("user_membership_level_valid");
  });

  it("rejects a role outside the allowed set", async () => {
    const db = getDb();
    const id = `test-badrole-${Date.now()}`;

    await db
      .insert(users)
      .values({ id, name: "Hopeful", email: `${id}@example.com` });

    const error = await db
      .insert(userRoles)
      .values({ userId: id, role: "overlord" as unknown as "officer" })
      .then(
        () => undefined,
        (reason: unknown) => reason,
      );

    const cause = (error as { cause?: { constraint?: string } } | undefined)
      ?.cause;
    expect(cause?.constraint).toBe("user_roles_role_valid");

    await db.delete(users).where(eq(users.id, id));
  });
});
