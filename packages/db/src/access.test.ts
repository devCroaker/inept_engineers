import { describe, expect, it } from "vitest";

import {
  MEMBER_DATA_POLICY,
  MEMBER_DATA_STORES,
  canReadMemberData,
} from "./access.js";
import { ROLES, type Role } from "./schema/roles.js";

const SELF = "user-self";
const OTHER = "user-other";

const as = (...roles: Role[]) => ({ viewerId: OTHER, viewerRoles: roles });

describe("canReadMemberData", () => {
  it("refuses everything to a signed-out viewer, including profiles", () => {
    for (const store of MEMBER_DATA_STORES) {
      expect(canReadMemberData(store, SELF, {})).toBe(false);
    }
  });

  it("lets a member read all of their own data", () => {
    for (const store of MEMBER_DATA_STORES) {
      expect(
        canReadMemberData(store, SELF, { viewerId: SELF, viewerRoles: [] }),
      ).toBe(true);
    }
  });

  it("shows profiles to any signed-in member", () => {
    expect(canReadMemberData("profile", SELF, as())).toBe(true);
  });

  describe("medical", () => {
    it("is readable by medical", () => {
      expect(canReadMemberData("medical", SELF, as("medical"))).toBe(true);
    });

    it("is not readable by kitchen, officers, or sisters", () => {
      for (const role of [
        "kitchen",
        "officer",
        "sister",
        "captain",
        "money",
        "web",
      ] as Role[]) {
        expect(canReadMemberData("medical", SELF, as(role))).toBe(false);
      }
    });
  });

  describe("dietary", () => {
    it("is readable by medical and kitchen", () => {
      expect(canReadMemberData("dietary", SELF, as("medical"))).toBe(true);
      expect(canReadMemberData("dietary", SELF, as("kitchen"))).toBe(true);
    });

    it("is not readable by officers or sisters on its own", () => {
      expect(canReadMemberData("dietary", SELF, as("officer"))).toBe(false);
      expect(canReadMemberData("dietary", SELF, as("sister"))).toBe(false);
    });
  });

  describe("contact and emergency contacts", () => {
    it("are readable by sisters and officers", () => {
      for (const store of ["contact", "emergencyContacts"] as const) {
        expect(canReadMemberData(store, SELF, as("sister"))).toBe(true);
        expect(canReadMemberData(store, SELF, as("officer"))).toBe(true);
      }
    });

    it("are not readable by kitchen or medical on their own", () => {
      for (const store of ["contact", "emergencyContacts"] as const) {
        expect(canReadMemberData(store, SELF, as("kitchen"))).toBe(false);
        expect(canReadMemberData(store, SELF, as("medical"))).toBe(false);
      }
    });
  });

  it("grants access from any one of several held roles", () => {
    const kitchenOfficer = as("kitchen", "officer");
    expect(canReadMemberData("dietary", SELF, kitchenOfficer)).toBe(true);
    expect(canReadMemberData("emergencyContacts", SELF, kitchenOfficer)).toBe(
      true,
    );
    // Still not medical: holding several roles does not accumulate into it.
    expect(canReadMemberData("medical", SELF, kitchenOfficer)).toBe(false);
  });

  it("never grants a store to a role the policy does not list", () => {
    // Catches a role being quietly added to a policy without a matching test.
    for (const store of MEMBER_DATA_STORES) {
      const policy = MEMBER_DATA_POLICY[store];
      if (policy.allMembers) continue;
      for (const role of ROLES) {
        const expected = policy.roles.includes(role);
        expect(canReadMemberData(store, SELF, as(role))).toBe(expected);
      }
    }
  });
});
