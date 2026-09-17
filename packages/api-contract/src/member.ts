import { z } from "@hono/zod-openapi";

import { MembershipLevelSchema, RoleSchema } from "./common.js";

/**
 * The public face of a member, visible to any signed-in member.
 *
 * Deliberately contains nothing from member_contact, emergency_contacts,
 * member_dietary, or member_medical. Those have narrower audiences and are
 * served by their own endpoints, so that adding a field here can never
 * accidentally widen who can see sensitive data.
 */
export const ProfileSchema = z
  .object({
    userId: z.string(),
    scaName: z.string().nullable(),
    pronouns: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    bio: z.string().nullable(),
  })
  .openapi("Profile");

/**
 * What the signed-in member is allowed to do.
 *
 * Sent by the server rather than worked out in the browser from `roles`. The
 * rules live in one place, @inept/db's access policy, and the UI reads the
 * answer instead of restating the question. A client that guessed would drift
 * the moment a role's meaning changed, and would show buttons that then fail.
 *
 * This is for deciding what to render. It is not a security boundary: every
 * endpoint checks the same policy again for itself.
 */
export const ViewerCapabilitiesSchema = z
  .object({
    manageEvents: z.boolean(),
    rsvp: z.boolean(),
  })
  .openapi("ViewerCapabilities");

/** The signed-in user's own view of themselves. */
export const ViewerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    image: z.url().nullable(),
    membershipLevel: MembershipLevelSchema,
    roles: z.array(RoleSchema),
    profile: ProfileSchema.nullable(),
    can: ViewerCapabilitiesSchema,
  })
  .openapi("Viewer");

export const UpdateProfileSchema = ProfileSchema.omit({ userId: true })
  .partial()
  .openapi("UpdateProfile");

export type ViewerCapabilities = z.infer<typeof ViewerCapabilitiesSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Viewer = z.infer<typeof ViewerSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
