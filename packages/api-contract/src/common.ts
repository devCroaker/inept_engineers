import { z } from "@hono/zod-openapi";

/** Shape returned by every non-2xx response. */
export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: "unauthorized" }),
      message: z.string().openapi({ example: "Sign in to continue." }),
    }),
  })
  .openapi("Error");

export const MembershipLevelSchema = z
  .enum(["foe", "member"])
  .openapi("MembershipLevel");

export const RoleSchema = z
  .enum([
    "sister",
    "officer",
    "captain",
    "triad",
    "medical",
    "money",
    "web",
    "kitchen",
  ])
  .openapi("Role");

export type ErrorResponse = z.infer<typeof ErrorSchema>;
