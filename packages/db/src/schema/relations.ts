import { relations } from "drizzle-orm";

import { users } from "./auth.js";
import {
  emergencyContacts,
  memberContact,
  memberDietary,
  memberMedical,
  profiles,
} from "./members.js";
import { userRoles } from "./roles.js";

/**
 * Declared here rather than beside the tables so that everything hanging off a
 * user is visible in one place, which makes it obvious how much of it is
 * access-controlled.
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  contact: one(memberContact, {
    fields: [users.id],
    references: [memberContact.userId],
  }),
  dietary: one(memberDietary, {
    fields: [users.id],
    references: [memberDietary.userId],
  }),
  medical: one(memberMedical, {
    fields: [users.id],
    references: [memberMedical.userId],
  }),
  emergencyContacts: many(emergencyContacts),
  roles: many(userRoles),
}));
