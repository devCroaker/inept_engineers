import { describe, expect, it } from "vitest";

import { repliesOpen } from "./events";

const NOW = new Date("2026-10-03T12:00:00.000Z");

const event = (over: Partial<Parameters<typeof repliesOpen>[0]> = {}) => ({
  status: "published" as const,
  startsAt: "2026-10-10T18:00:00.000Z",
  endsAt: null,
  ...over,
});

describe("repliesOpen", () => {
  it("is open for an upcoming event", () => {
    expect(repliesOpen(event(), NOW)).toBe(true);
  });

  it("is closed once a cancelled event is read, however far off it is", () => {
    expect(repliesOpen(event({ status: "cancelled" }), NOW)).toBe(false);
  });

  it("stays open for a draft, which only leadership can see anyway", () => {
    expect(repliesOpen(event({ status: "draft" }), NOW)).toBe(true);
  });

  it("closes when an event with no end time has started", () => {
    expect(
      repliesOpen(event({ startsAt: "2026-10-03T11:59:00.000Z" }), NOW),
    ).toBe(false);
  });

  it("stays open during a multi-day event that has not ended", () => {
    expect(
      repliesOpen(
        {
          status: "published",
          startsAt: "2026-10-02T18:00:00.000Z",
          endsAt: "2026-10-05T18:00:00.000Z",
        },
        NOW,
      ),
    ).toBe(true);
  });
});
