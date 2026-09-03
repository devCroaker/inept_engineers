import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./auth.js";

/**
 * Roles a person can hold, any number at once.
 *
 * Two kinds live in this one list because both behave the same way, and both
 * are things a person either holds or does not:
 *
 * - Leadership standing: `sister` and `officer` are parallel tracks, not a
 *   ranking. Someone can hold both, one, or neither.
 * - Jobs: `captain`, `triad`, `medical`, `money`, `web`, and `kitchen`.
 *
 * Holding a job does not require any particular standing, so a member can run
 * the kitchen.
 *
 * The sponsorship progression (foe to member) is deliberately NOT here. It is
 * a single value that advances, so it lives on the user row as
 * `membershipLevel` where the database can guarantee exactly one.
 *
 * Adding a role means a migration to widen the check constraint and adding the
 * value below. That is intentional: role names are compared in access-control
 * code, so keeping them a TypeScript union means a typo fails the build rather
 * than silently denying access.
 */
export const ROLES = [
  "sister",
  "officer",
  "captain",
  "triad",
  "medical",
  "money",
  "web",
  "kitchen",
] as const;
export type Role = (typeof ROLES)[number];

const roleValues = ROLES.map((role) => `'${role}'`).join(", ");

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<Role>().notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.role] }),
    index("user_roles_role_idx").on(table.role),
    check("user_roles_role_valid", sql.raw(`role in (${roleValues})`)),
  ],
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
}));

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
