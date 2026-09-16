import { createAuth, toViewer, type Auth, type Viewer } from "@inept/auth";
import type { Context, MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import { errorBody } from "./errors.js";

export interface AppEnv {
  Variables: {
    auth: Auth;
    /** The signed-in member, or undefined when signed out. */
    viewer: Viewer | undefined;
  };
}

let cachedAuth: Auth | undefined;

/** Built once per process so warm Lambda invocations reuse it. */
export function getAuth(): Auth {
  cachedAuth ??= createAuth();
  return cachedAuth;
}

/**
 * Resolves the session on every request and attaches the viewer.
 *
 * Roles are loaded from the database here rather than read from the session
 * token, so granting or revoking a role takes effect on the next request. That
 * matters for revocation: removing someone from `medical` must stop them
 * reading medications immediately, not whenever their session happens to end.
 */
export const withViewer: MiddlewareHandler<AppEnv> = createMiddleware<AppEnv>(
  async (c, next) => {
    const auth = getAuth();
    c.set("auth", auth);

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set("viewer", session ? await toViewer(session) : undefined);

    await next();
  },
);

/** Rejects the request when nobody is signed in. */
export const requireViewer: MiddlewareHandler<AppEnv> =
  createMiddleware<AppEnv>(async (c, next) => {
    if (!c.get("viewer")) {
      return c.json(errorBody("unauthorized", "Sign in to continue."), 401);
    }
    await next();
  });

/** Narrowing helper for handlers that run behind requireViewer. */
export function viewerOf(c: Context<AppEnv>): Viewer {
  const viewer = c.get("viewer");
  if (!viewer) {
    throw new Error("viewerOf called outside requireViewer");
  }
  return viewer;
}
