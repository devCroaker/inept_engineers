import type { EventKind, EventStatus, RsvpStatus } from "@inept/api-client";

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  camping: "Camping",
  party: "Party",
  day_event: "Day event",
  practice: "Practice",
  meeting: "Meeting",
  other: "Event",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Published",
  cancelled: "Cancelled",
};

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  yes: "Going",
  maybe: "Maybe",
  no: "Not going",
};

const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

function part(
  value: Date,
  options: Intl.DateTimeFormatOptions,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(
    value,
  );
}

/**
 * The calendar day a moment falls on, in the given zone, as a sortable string.
 * Comparing these is how "same day" is decided: comparing the instants would
 * call 11pm and 1am the same day when they are not.
 */
function dayKey(value: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

/**
 * Formats a plain calendar date, the `YYYY-MM-DD` the API uses for arrival and
 * departure.
 *
 * Parsed as UTC and formatted as UTC on purpose. `new Date("2026-10-02")` is
 * midnight UTC, so formatting it in a zone behind UTC prints the first of
 * October: the day someone said they were arriving would silently move.
 */
export function formatPlainDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return part(new Date(Date.UTC(year, month - 1, day)), DAY_FORMAT, "UTC");
}

/**
 * The `YYYY-MM-DD` an instant falls on, which is the value a native date input
 * wants. Used to bound arrival and departure to the days of the event.
 */
export function toDateInput(iso: string, timeZone?: string): string {
  return dayKey(new Date(iso), timeZone);
}

/**
 * An instant as a `datetime-local` input wants it: the wall clock the person
 * sitting in front of the browser reads, with no zone on the end.
 *
 * Built from the local getters rather than from toISOString, which would hand
 * back UTC and shift the time an organiser typed.
 */
export function toDateTimeInput(iso: string): string {
  const value = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    `${String(value.getFullYear())}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` +
    `T${pad(value.getHours())}:${pad(value.getMinutes())}`
  );
}

/** The inverse: a wall clock reading back to an instant the API can store. */
export function fromDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}

export function isMultiDay(
  startsAt: string,
  endsAt: string | null,
  timeZone?: string,
): boolean {
  if (!endsAt) return false;
  return (
    dayKey(new Date(startsAt), timeZone) !== dayKey(new Date(endsAt), timeZone)
  );
}

/**
 * How an event's dates read on a card or heading.
 *
 * Three shapes, because one format does not suit all three cases. A multi-day
 * camping event is described by its days: nobody plans a weekend around the
 * minute the gate opens, and showing times there is noise. A single-day event
 * is the opposite, where the time is the useful part.
 *
 * `timeZone` exists so tests are not at the mercy of the machine's clock
 * setting. Left undefined in the app, which is what shows each member the times
 * in their own zone.
 */
export function formatEventDates(
  startsAt: string,
  endsAt: string | null,
  timeZone?: string,
): string {
  const start = new Date(startsAt);
  const startDay = part(start, DAY_FORMAT, timeZone);

  if (!endsAt) {
    return `${startDay}, ${part(start, TIME_FORMAT, timeZone)}`;
  }

  const end = new Date(endsAt);

  if (isMultiDay(startsAt, endsAt, timeZone)) {
    return `${startDay} to ${part(end, DAY_FORMAT, timeZone)}`;
  }

  return `${startDay}, ${part(start, TIME_FORMAT, timeZone)} to ${part(
    end,
    TIME_FORMAT,
    timeZone,
  )}`;
}

/**
 * Headcount phrased for a human.
 *
 * Guests are counted in the total but are not members, so the sentence says so
 * rather than leaving a kitchen lead to work out why the numbers differ.
 */
function plural(count: number, noun: string): string {
  return `${String(count)} ${count === 1 ? noun : `${noun}s`}`;
}

export function formatHeadcount(attendance: {
  yes: number;
  maybe: number;
  expectedHeadcount: number;
}): string {
  const { yes, maybe, expectedHeadcount } = attendance;

  if (yes === 0 && maybe === 0) {
    return "No replies yet";
  }

  const guests = expectedHeadcount - yes;
  const going =
    guests > 0
      ? `${String(expectedHeadcount)} expected (${plural(yes, "member")} plus ${plural(guests, "guest")})`
      : `${String(yes)} going`;

  return maybe > 0 ? `${going}, ${String(maybe)} maybe` : going;
}
