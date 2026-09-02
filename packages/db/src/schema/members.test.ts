import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { MEMBER_PRIVATE_FIELDS, memberPrivate } from "./members.js";

describe("member_private", () => {
  /**
   * The API layer uses MEMBER_PRIVATE_FIELDS to decide what must never be
   * serialised into a public response. If a sensitive column is added to the
   * table and not to that list, it would silently become exposable, so this
   * test fails the build instead.
   */
  it("lists every sensitive column in MEMBER_PRIVATE_FIELDS", () => {
    const structural = new Set(["userId", "createdAt", "updatedAt"]);
    const sensitiveColumns = Object.keys(getTableColumns(memberPrivate))
      .filter((name) => !structural.has(name))
      .sort();

    expect(sensitiveColumns).toEqual([...MEMBER_PRIVATE_FIELDS].sort());
  });
});
