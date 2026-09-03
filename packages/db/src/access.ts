import type { Role } from "./schema/roles.js";

/**
 * Who may read each store of member data.
 *
 * This is the single source of truth for the policy. The API layer consults
 * it rather than restating the rules, and the tests assert against it, so a
 * change here changes behaviour and expectations together.
 *
 * Every entry also implicitly allows the member themselves; that is handled by
 * `canReadMemberData` rather than repeated in each list.
 */
export const MEMBER_DATA_STORES = [
  "profile",
  "contact",
  "emergencyContacts",
  "dietary",
  "medical",
] as const;

export type MemberDataStore = (typeof MEMBER_DATA_STORES)[number];

interface StorePolicy {
  /** Roles granted read access in addition to the member themselves. */
  readonly roles: readonly Role[];
  /** Any signed-in member may read it, regardless of role. */
  readonly allMembers?: boolean;
  readonly description: string;
}

export const MEMBER_DATA_POLICY: Record<MemberDataStore, StorePolicy> = {
  profile: {
    roles: [],
    allMembers: true,
    description: "SCA name, pronouns, city and state, bio.",
  },
  contact: {
    roles: ["sister", "officer"],
    description: "Legal name, phone, accessibility notes.",
  },
  emergencyContacts: {
    roles: ["sister", "officer"],
    description: "Next of kin and how to reach them.",
  },
  dietary: {
    roles: ["medical", "kitchen"],
    description: "Allergies and dietary restrictions, needed to cook safely.",
  },
  medical: {
    roles: ["medical"],
    description: "Medications and conditions. The most restricted data held.",
  },
};

export interface AccessContext {
  /** The signed-in user's id, or undefined when not signed in. */
  viewerId?: string;
  /** Roles held by the signed-in user. */
  viewerRoles?: readonly Role[];
}

/**
 * Returns whether `context` may read `store` for the member `subjectId`.
 *
 * Signed-out viewers are refused everything, including profiles: this is a
 * private household roster, not public directory data.
 */
export function canReadMemberData(
  store: MemberDataStore,
  subjectId: string,
  context: AccessContext,
): boolean {
  const { viewerId, viewerRoles = [] } = context;

  if (!viewerId) {
    return false;
  }

  // A member can always read their own data, including their own medical row.
  if (viewerId === subjectId) {
    return true;
  }

  const policy = MEMBER_DATA_POLICY[store];

  if (policy.allMembers) {
    return true;
  }

  return policy.roles.some((role) => viewerRoles.includes(role));
}
