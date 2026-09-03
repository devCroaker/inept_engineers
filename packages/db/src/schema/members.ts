import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "./auth.js";

/**
 * Member data is split across tables by WHO IS ALLOWED TO READ IT, not by
 * topic. Each table below has exactly one audience, which means access can be
 * enforced structurally: code physically cannot leak a field it did not join.
 * That is a much stronger guarantee than remembering to omit columns.
 *
 * The authoritative policy lives in ../access.ts. It is exported so the API
 * layer and its tests share one definition rather than restating the rules.
 *
 *   profiles           every signed-in member
 *   memberContact      the member, plus sister or officer
 *   emergencyContacts  the member, plus sister or officer
 *   memberDietary      the member, plus medical or kitchen
 *   memberMedical      the member, plus medical
 */

/** Visible to any signed-in member. Nothing here is sensitive. */
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Society name, which is often not the member's legal name. */
  scaName: text("sca_name"),
  pronouns: text("pronouns"),
  /** Rough location only, for carpooling and travel planning. No street address. */
  city: text("city"),
  state: text("state"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Administrative contact details. Readable by the member, sisters, and officers. */
export const memberContact = pgTable("member_contact", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  legalName: text("legal_name"),
  phone: text("phone"),
  /** Mobility or accommodation needs relevant to planning a camp. */
  accessibilityNotes: text("accessibility_notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Next of kin. Multiple rows per member, ordered by `priority` so whoever is
 * calling knows who to try first. Same audience as memberContact.
 */
export const emergencyContacts = pgTable(
  "emergency_contacts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    /** Free text, for example "spouse" or "mother". */
    relationship: text("relationship"),
    /** Lower is contacted first. */
    priority: integer("priority").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("emergency_contacts_user_id_idx").on(table.userId, table.priority),
  ],
);

/**
 * Food-related health information. Readable by the member, medical, and
 * kitchen, because those are the people planning and cooking the meals.
 */
export const memberDietary = pgTable("member_dietary", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  allergies: text("allergies"),
  dietaryRestrictions: text("dietary_restrictions"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * The most restricted data in the system. Readable by the member and by
 * medical only. Deliberately its own table so that no query written for the
 * kitchen or for officers can reach it by accident.
 */
export const memberMedical = pgTable("member_medical", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  medications: text("medications"),
  /** Conditions responders should know about, such as diabetes or epilepsy. */
  conditions: text("conditions"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const memberContactRelations = relations(memberContact, ({ one }) => ({
  user: one(users, { fields: [memberContact.userId], references: [users.id] }),
}));

export const emergencyContactsRelations = relations(
  emergencyContacts,
  ({ one }) => ({
    user: one(users, {
      fields: [emergencyContacts.userId],
      references: [users.id],
    }),
  }),
);

export const memberDietaryRelations = relations(memberDietary, ({ one }) => ({
  user: one(users, { fields: [memberDietary.userId], references: [users.id] }),
}));

export const memberMedicalRelations = relations(memberMedical, ({ one }) => ({
  user: one(users, { fields: [memberMedical.userId], references: [users.id] }),
}));

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type MemberContact = typeof memberContact.$inferSelect;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type NewEmergencyContact = typeof emergencyContacts.$inferInsert;
export type MemberDietary = typeof memberDietary.$inferSelect;
export type MemberMedical = typeof memberMedical.$inferSelect;
