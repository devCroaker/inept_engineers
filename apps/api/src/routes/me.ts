import { ErrorSchema, ViewerSchema } from "@inept/api-contract";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { getDb, profiles } from "@inept/db";
import { eq } from "drizzle-orm";

import { type AppEnv, requireViewer, viewerOf } from "../lib/session.js";

const getMe = createRoute({
  method: "get",
  path: "/me",
  tags: ["Members"],
  summary: "The signed-in member",
  description:
    "Returns identity, membership level, roles, and public profile. Sensitive stores " +
    "(contact details, emergency contacts, dietary, medical) are deliberately not included " +
    "here; each is served by its own endpoint so their narrower audiences stay enforced.",
  security: [{ sessionCookie: [] }],
  middleware: [requireViewer] as const,
  responses: {
    200: {
      content: { "application/json": { schema: ViewerSchema } },
      description: "The signed-in member.",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not signed in.",
    },
  },
});

export const meRouter = new OpenAPIHono<AppEnv>().openapi(getMe, async (c) => {
  const viewer = viewerOf(c);

  const profile = await getDb().query.profiles.findFirst({
    where: eq(profiles.userId, viewer.id),
  });

  return c.json(
    {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email,
      image: null,
      membershipLevel: viewer.membershipLevel,
      roles: viewer.roles,
      profile: profile
        ? {
            userId: profile.userId,
            scaName: profile.scaName,
            pronouns: profile.pronouns,
            city: profile.city,
            state: profile.state,
            bio: profile.bio,
          }
        : null,
    },
    200,
  );
});
