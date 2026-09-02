import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "./auth.js";

/**
 * Member data is deliberately split across two tables by sensitivity.
 *
 * `profiles` is the public face of a member: the SCA name and pronouns other
 * members see on an attendee list.
 *
 * `memberPrivate` holds information that must never appear in a public API
 * response: legal name, contact details, emergency contacts, and
 * health-adjacent data such as allergies and dietary restrictions. It lives in
 * its own table so that exposing it requires an explicit join, rather than
 * being one forgotten `omit` away from leaking out of a profile endpoint.
 *
 * Access rule enforced in the API layer: a member may read and write their own
 * private row; organizers and admins may read all of them, because whoever is
 * cooking needs the allergy list. Nothing else may read them, and these fields
 * are excluded from logs.
 */

export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Society name, which is often not the member's legal name. */
  scaName: text("sca_name"),
  pronouns: text("pronouns"),
  /** Home barony, shire, or canton. Free text, since members travel. */
  homeBranch: text("home_branch"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberPrivate = pgTable("member_private", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  legalName: text("legal_name"),
  phone: text("phone"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  /** Health-adjacent. Needed by whoever plans and cooks the feast. */
  dietaryRestrictions: text("dietary_restrictions"),
  allergies: text("allergies"),
  /** Anything the member wants organizers to know, such as mobility needs. */
  accessibilityNotes: text("accessibility_notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  private: one(memberPrivate, {
    fields: [users.id],
    references: [memberPrivate.userId],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const memberPrivateRelations = relations(memberPrivate, ({ one }) => ({
  user: one(users, { fields: [memberPrivate.userId], references: [users.id] }),
}));

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type MemberPrivate = typeof memberPrivate.$inferSelect;
export type NewMemberPrivate = typeof memberPrivate.$inferInsert;

/**
 * Column names in `member_private`. Used by the API layer and by tests that
 * assert none of these ever appear in a public response body.
 */
export const MEMBER_PRIVATE_FIELDS = [
  "legalName",
  "phone",
  "emergencyContactName",
  "emergencyContactPhone",
  "dietaryRestrictions",
  "allergies",
  "accessibilityNotes",
] as const;
