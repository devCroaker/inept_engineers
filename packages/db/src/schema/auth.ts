import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Tables owned by Better Auth.
 *
 * The shapes here mirror exactly what `getAuthTables()` reports for the
 * installed version of better-auth, including the compound unique index on
 * (issuer, account_id). Do not change these by hand to suit application needs;
 * application data belongs in members.ts and roles.ts instead.
 *
 * Better Auth generates its own string identifiers, so `id` is text rather
 * than a database-generated uuid.
 */

/**
 * Membership level, which is a progression rather than a set. Everyone starts
 * as a Friend of Engineers and advances to member through the sponsorship
 * process. Leadership standing (sister, officer) and jobs (kitchen, medical,
 * and so on) are separate and live in user_roles, because a person can hold
 * several of those at once.
 */
export const MEMBERSHIP_LEVELS = ["foe", "member"] as const;
export type MembershipLevel = (typeof MEMBERSHIP_LEVELS)[number];

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    /**
     * Declared to Better Auth via `user.additionalFields` so every account gets
     * the default at sign-up. Text with a check constraint rather than a
     * Postgres enum, so the auth adapter never has to know about a custom type.
     */
    membershipLevel: text("membership_level")
      .$type<MembershipLevel>()
      .notNull()
      .default("foe"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_email_idx").on(table.email),
    check(
      "user_membership_level_valid",
      sql`${table.membershipLevel} in ('foe', 'member')`,
    ),
  ],
);

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("session_token_idx").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

/**
 * One row per sign-in method. A single person may hold several: a credential
 * row for email and password, plus a Google row and a Discord row, all
 * pointing at the same user. That is what lets someone sign in whichever way
 * is convenient and land in the same account.
 *
 * The unique index on (issuer, account_id) prevents the reverse problem: one
 * external account cannot be attached to two different users.
 */
export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    /**
     * Set only on credential accounts, where it holds the hashed password.
     * Null for Google and Discord rows, which authenticate against the
     * provider instead.
     */
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("account_issuer_account_id_idx").on(
      table.issuer,
      table.accountId,
    ),
    index("account_user_id_idx").on(table.userId),
  ],
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
