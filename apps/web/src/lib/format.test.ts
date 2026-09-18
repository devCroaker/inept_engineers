import { describe, expect, it } from "vitest";

import {
  formatEventDates,
  formatHeadcount,
  formatPlainDate,
  fromDateTimeInput,
  isMultiDay,
  toDateInput,
  toDateTimeInput,
} from "./format";

// Pinned so the assertions do not depend on the machine running them.
const TZ = "America/Los_Angeles";

describe("formatEventDates", () => {
  it("shows the time when an event has no end", () => {
    expect(formatEventDates("2026-10-03T01:00:00.000Z", null, TZ)).toBe(
      "Fri, Oct 2, 6:00 PM",
    );
  });

  it("shows both times when an event starts and ends the same day", () => {
    expect(
      formatEventDates(
        "2026-10-03T18:00:00.000Z",
        "2026-10-03T23:30:00.000Z",
        TZ,
      ),
    ).toBe("Sat, Oct 3, 11:00 AM to 4:30 PM");
  });

  it("shows days rather than times across a weekend", () => {
    expect(
      formatEventDates(
        "2026-10-02T23:00:00.000Z",
        "2026-10-04T19:00:00.000Z",
        TZ,
      ),
    ).toBe("Fri, Oct 2 to Sun, Oct 4");
  });

  it("decides the day boundary in the viewer's zone, not UTC", () => {
    // 11pm to 11:30pm on Oct 2 in Los Angeles, which is Oct 3 in UTC.
    const startsAt = "2026-10-03T06:00:00.000Z";
    const endsAt = "2026-10-03T06:30:00.000Z";

    expect(isMultiDay(startsAt, endsAt, TZ)).toBe(false);
    expect(isMultiDay(startsAt, endsAt, "UTC")).toBe(false);

    // And one that genuinely crosses midnight locally.
    expect(isMultiDay(startsAt, "2026-10-03T08:00:00.000Z", TZ)).toBe(true);
  });
});

describe("formatHeadcount", () => {
  it("says so plainly when nobody has replied", () => {
    expect(formatHeadcount({ yes: 0, maybe: 0, expectedHeadcount: 0 })).toBe(
      "No replies yet",
    );
  });

  it("counts only members when no guests are coming", () => {
    expect(formatHeadcount({ yes: 4, maybe: 0, expectedHeadcount: 4 })).toBe(
      "4 going",
    );
  });

  it("separates guests from members so the kitchen can read it", () => {
    expect(formatHeadcount({ yes: 4, maybe: 2, expectedHeadcount: 7 })).toBe(
      "7 expected (4 members plus 3 guests), 2 maybe",
    );
  });

  it("uses the singular for one guest", () => {
    expect(formatHeadcount({ yes: 2, maybe: 0, expectedHeadcount: 3 })).toBe(
      "3 expected (2 members plus 1 guest)",
    );
  });

  it("uses the singular for one member too", () => {
    expect(formatHeadcount({ yes: 1, maybe: 0, expectedHeadcount: 3 })).toBe(
      "3 expected (1 member plus 2 guests)",
    );
  });

  it("reports maybes even when nobody has said yes", () => {
    expect(formatHeadcount({ yes: 0, maybe: 3, expectedHeadcount: 0 })).toBe(
      "0 going, 3 maybe",
    );
  });
});

describe("formatPlainDate", () => {
  it("prints the day it was given, west of UTC", () => {
    // The bug this guards against: new Date("2026-10-02") is midnight UTC, so
    // formatting it in a zone behind UTC prints Oct 1 and moves the day
    // somebody said they were arriving.
    expect(formatPlainDate("2026-10-02")).toBe("Fri, Oct 2");
  });

  it("returns anything unparseable unchanged rather than inventing a date", () => {
    expect(formatPlainDate("")).toBe("");
    expect(formatPlainDate("not-a-date")).toBe("not-a-date");
  });
});

describe("toDateInput", () => {
  it("gives the day in the viewer's zone, which is what a date input wants", () => {
    // 11pm on Oct 2 in Los Angeles is already Oct 3 in UTC.
    expect(toDateInput("2026-10-03T06:00:00.000Z", TZ)).toBe("2026-10-02");
    expect(toDateInput("2026-10-03T06:00:00.000Z", "UTC")).toBe("2026-10-03");
  });
});

describe("datetime inputs", () => {
  it("round trips an instant through the input format", () => {
    // Whatever zone this runs in, what an organiser reads back must be the
    // moment that was stored, to the minute the input can express.
    const iso = "2026-10-17T01:30:00.000Z";
    expect(fromDateTimeInput(toDateTimeInput(iso))).toBe(iso);
  });

  it("formats as a wall clock, with no zone suffix", () => {
    expect(toDateTimeInput("2026-10-17T01:30:00.000Z")).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    );
  });
});
