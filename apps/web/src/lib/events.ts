import type { ApiEvent } from "@inept/api-client";

/**
 * Whether the API will still accept an RSVP.
 *
 * Mirrors the two 409s the RSVP endpoint returns: a cancelled event, and one
 * that has already finished. Kept in one place so the form and the empty
 * roster agree, rather than the form disappearing while the roster goes on
 * inviting people to be the first to reply.
 *
 * An event with no end time is over once it has started, which is the same
 * `endsAt ?? startsAt` the endpoint uses.
 */
export function repliesOpen(
  event: Pick<ApiEvent, "status" | "startsAt" | "endsAt">,
  now: Date = new Date(),
): boolean {
  if (event.status === "cancelled") return false;
  return new Date(event.endsAt ?? event.startsAt) >= now;
}
