import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";

import { ApiError, errorBody } from "./lib/errors.js";
import { type AppEnv, getAuth, withViewer } from "./lib/session.js";
import { healthRouter } from "./routes/health.js";
import { eventsRouter } from "./routes/events.js";
import { meRouter } from "./routes/me.js";
import { rsvpsRouter } from "./routes/rsvps.js";

export const OPENAPI_INFO = {
  openapi: "3.1.0",
  info: {
    title: "Inept Engineers API",
    version: "0.1.0",
    description:
      "Backs ineptengineers.com. The OpenAPI document is generated from the same Zod schemas " +
      "used for runtime validation, so the two cannot drift apart.",
  },
} as const;

export function createApp() {
  const app = new OpenAPIHono<AppEnv>({
    // Surface validation failures in the same envelope as every other error.
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody(
            "bad_request",
            result.error.issues[0]?.message ?? "Invalid request.",
          ),
          400,
        );
      }
      return undefined;
    },
  });

  app.use("*", requestId());
  app.use("*", logger());

  // In AWS the browser only ever talks to one origin via CloudFront, so CORS
  // exists purely for local development against the Next.js dev server.
  if (process.env.NODE_ENV !== "production") {
    app.use(
      "*",
      cors({ origin: ["http://localhost:3000"], credentials: true }),
    );
  }

  /**
   * Better Auth owns everything under /auth: sign-in, callbacks, sign-out,
   * account linking. It is mounted before withViewer because these routes
   * establish the session rather than consume it.
   */
  app.on(["GET", "POST"], "/auth/*", (c) => getAuth().handler(c.req.raw));

  app.use("*", withViewer);

  app.route("/", healthRouter);
  app.route("/", meRouter);
  app.route("/", eventsRouter);
  app.route("/", rsvpsRouter);

  app.openAPIRegistry.registerComponent("securitySchemes", "sessionCookie", {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
    description: "Session cookie issued by Better Auth after sign-in.",
  });

  return app;
}

/**
 * Mounts the API under /api.
 *
 * Note: OpenAPIHono#basePath() returns a fresh instance with an empty OpenAPI
 * registry, which silently produces a document containing no paths or schemas.
 * Mounting with route() is what preserves the registered routes.
 */
export function createRootApp() {
  const root = new OpenAPIHono<AppEnv>();
  root.route("/api", createApp());

  // These must be registered on the root. Mounting a sub-app with route()
  // does not adopt that sub-app's onError or notFound handlers, so putting
  // them on the inner app silently leaves Hono's plain-text defaults in place.
  root.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json(errorBody(err.code, err.message), err.status);
    }
    console.error("Unhandled error:", err);
    return c.json(errorBody("internal_error", "Something went wrong."), 500);
  });

  root.notFound((c) => c.json(errorBody("not_found", "No such route."), 404));

  // Generated from the root so paths carry the /api prefix. Generating from
  // the inner app instead yields /me rather than /api/me, which disagrees with
  // the emitted openapi.json and with what clients actually have to call.
  root.doc31("/api/doc", OPENAPI_INFO);
  root.get(
    "/api/reference",
    Scalar({ url: "/api/doc", pageTitle: "Inept Engineers API" }),
  );

  return root;
}
