import type { Event as EventDto } from "@inept/api-contract";
import type { Event, Rsvp } from "@inept/db";

/** Postgres returns Date objects; the contract speaks ISO 8601 strings. */
function iso(value: Date): string {
  return value.toISOString();
}

function isoOrNull(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export interface AttendanceCounts {
  yes: number;
  maybe: number;
  no: number;
  expectedHeadcount: number;
}

/**
 * Turns a set of RSVPs into the counts shown on a listing.
 *
 * Expected headcount counts members who said yes plus the guests they are
 * bringing, which is the number that matters for site fees and meal planning.
 * Maybes are deliberately excluded: over-catering is a cost, and a maybe that
 * firms up becomes a yes.
 */
export function summariseAttendance(
  rows: Pick<Rsvp, "status" | "guestCount">[],
): AttendanceCounts {
  const counts = { yes: 0, maybe: 0, no: 0, expectedHeadcount: 0 };

  for (const row of rows) {
    counts[row.status] += 1;
    if (row.status === "yes") {
      counts.expectedHeadcount += 1 + row.guestCount;
    }
  }

  return counts;
}

export function toEventDto(
  event: Event,
  attendance: AttendanceCounts,
  viewerRsvp: Rsvp | undefined,
): EventDto {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    kind: event.kind,
    status: event.status,
    startsAt: iso(event.startsAt),
    endsAt: isoOrNull(event.endsAt),
    location: event.location,
    address: event.address,
    externalRegistrationUrl: event.externalRegistrationUrl,
    capacity: event.capacity,
    attendance,
    viewerRsvp: viewerRsvp
      ? {
          status: viewerRsvp.status,
          arrivalDate: viewerRsvp.arrivalDate,
          departureDate: viewerRsvp.departureDate,
          guestCount: viewerRsvp.guestCount,
          notes: viewerRsvp.notes,
        }
      : null,
    createdAt: iso(event.createdAt),
    updatedAt: iso(event.updatedAt),
  };
}

/** Ids are generated here rather than by the database so inserts stay single round trips. */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 21)}`;
}
