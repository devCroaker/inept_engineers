import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "./client.js";
import { memberPrivate, profiles, users } from "./schema/index.js";

// Integration coverage. Skipped when no database is reachable, so `pnpm test`
// still passes without Docker running.
const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("member data", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("stores a member across the public and private tables", async () => {
    const db = getDb();
    const id = `test-user-${Date.now()}`;

    await db
      .insert(users)
      .values({ id, name: "Test Member", email: `${id}@example.com` });
    await db
      .insert(profiles)
      .values({ userId: id, scaName: "Wilhelm the Inept" });
    await db
      .insert(memberPrivate)
      .values({ userId: id, allergies: "shellfish" });

    const found = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: { profile: true, private: true },
    });

    expect(found?.role).toBe("member");
    expect(found?.profile?.scaName).toBe("Wilhelm the Inept");
    expect(found?.private?.allergies).toBe("shellfish");

    await db.delete(users).where(eq(users.id, id));
  });

  it("cascades deletion so no private row is orphaned", async () => {
    const db = getDb();
    const id = `test-cascade-${Date.now()}`;

    await db
      .insert(users)
      .values({ id, name: "Leaver", email: `${id}@example.com` });
    await db.insert(profiles).values({ userId: id });
    await db.insert(memberPrivate).values({ userId: id, phone: "555-0100" });

    await db.delete(users).where(eq(users.id, id));

    expect(
      await db.select().from(profiles).where(eq(profiles.userId, id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(memberPrivate).where(eq(memberPrivate.userId, id)),
    ).toHaveLength(0);
  });

  it("rejects a role outside the allowed set", async () => {
    const db = getDb();
    const id = `test-role-${Date.now()}`;

    // Drizzle wraps driver errors, so the constraint name is on the cause
    // rather than the top level message.
    const error = await db
      .insert(users)
      .values({
        id,
        name: "Impostor",
        email: `${id}@example.com`,
        // Deliberately invalid, cast past the type to prove the database
        // constraint holds even when application code gets it wrong.
        role: "superuser" as unknown as "admin",
      })
      .then(
        () => undefined,
        (reason: unknown) => reason,
      );

    expect(error).toBeDefined();
    const cause = (error as { cause?: { constraint?: string } }).cause;
    expect(cause?.constraint).toBe("user_role_valid");
  });
});
