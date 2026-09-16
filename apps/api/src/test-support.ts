import { getDb, userRoles, users, type Role } from "@inept/db";
import { eq } from "drizzle-orm";

import type { createRootApp } from "./app.js";

const ORIGIN = "http://localhost:3000";

/** The real app type, so this matches Hono's request() overloads exactly. */
type App = ReturnType<typeof createRootApp>;

export const jsonHeaders = {
  "content-type": "application/json",
  origin: ORIGIN,
};

export interface SignedInMember {
  userId: string;
  cookie: string;
  cleanup: () => Promise<void>;
}

/**
 * Creates a signed-in member and returns a real session cookie.
 *
 * Better Auth signs its session cookie, so one cannot be forged by inserting a
 * session row directly; that was tried and rejected with a 401. This goes
 * through the genuine sign-up and sign-in routes instead, flipping
 * emailVerified in between because verification needs mail the tests never
 * receive.
 */
export async function createSignedInMember(
  app: App,
  options: { name: string; roles?: Role[] },
): Promise<SignedInMember> {
  const db = getDb();
  const email = `test-${crypto.randomUUID()}@example.com`;
  const password = "a-sufficiently-long-password";

  const signUp = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email, password, name: options.name }),
  });
  if (!signUp.ok) {
    throw new Error(`sign-up failed: ${signUp.status}`);
  }
  const { user } = (await signUp.json()) as { user: { id: string } };

  await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, user.id));

  if (options.roles?.length) {
    await db
      .insert(userRoles)
      .values(options.roles.map((role) => ({ userId: user.id, role })));
  }

  const signIn = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  if (!signIn.ok) {
    throw new Error(`sign-in failed: ${signIn.status}`);
  }

  const cookie = signIn.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");

  return {
    userId: user.id,
    cookie,
    cleanup: async () => {
      await db.delete(users).where(eq(users.id, user.id));
    },
  };
}
