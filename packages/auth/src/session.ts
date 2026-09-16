import {
  getDb,
  userRoles,
  type AccessContext,
  type Database,
  type MembershipLevel,
  type Role,
} from "@inept/db";
import { eq } from "drizzle-orm";

/** The signed-in user as the rest of the application cares about them. */
export interface Viewer {
  id: string;
  email: string;
  name: string;
  membershipLevel: MembershipLevel;
  roles: Role[];
}

/**
 * Loads the roles held by a user.
 *
 * Roles live in their own table rather than on the session, so a role granted
 * or revoked takes effect on the next request instead of whenever the user
 * next signs in. That matters for revocation: removing someone from `medical`
 * should stop them reading medications immediately.
 */
export async function loadUserRoles(
  userId: string,
  db: Database = getDb(),
): Promise<Role[]> {
  const rows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  return rows.map((row) => row.role);
}

/** Shape Better Auth returns from `auth.api.getSession`. */
export interface SessionLike {
  user: {
    id: string;
    email: string;
    name: string;
    membershipLevel?: string | null;
  };
}

/** Builds a Viewer from a Better Auth session, filling in roles from the database. */
export async function toViewer(
  session: SessionLike,
  db: Database = getDb(),
): Promise<Viewer> {
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    membershipLevel: (session.user.membershipLevel ?? "foe") as MembershipLevel,
    roles: await loadUserRoles(session.user.id, db),
  };
}

/** Converts a Viewer into the context the member-data access policy expects. */
export function accessContextFor(viewer: Viewer | undefined): AccessContext {
  if (!viewer) {
    return {};
  }
  return { viewerId: viewer.id, viewerRoles: viewer.roles };
}

export function hasRole(viewer: Viewer | undefined, ...roles: Role[]): boolean {
  if (!viewer) {
    return false;
  }
  return roles.some((role) => viewer.roles.includes(role));
}

/** True when the viewer holds any role at all, meaning they do a job for the household. */
export function holdsAnyRole(viewer: Viewer | undefined): boolean {
  return (viewer?.roles.length ?? 0) > 0;
}

export function isFullMember(viewer: Viewer | undefined): boolean {
  return viewer?.membershipLevel === "member";
}
