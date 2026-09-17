"use client";

import type { Attendee, RsvpStatus } from "@inept/api-client";
import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { api, request } from "@/lib/api";
import { RSVP_LABELS, formatPlainDate } from "@/lib/format";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: Attendee[] };

/** Yes first: the list is read to find out who will actually be there. */
const ORDER: RsvpStatus[] = ["yes", "maybe", "no"];

/**
 * Who has replied.
 *
 * Open to every signed-in member rather than to organisers alone, matching the
 * endpoint: knowing who is going is most of the reason to look at an event at
 * all. The endpoint joins nothing from the contact, dietary, or medical
 * stores, so nothing sensitive can reach this list.
 */
export function AttendeeRoster({
  slug,
  invite,
}: {
  slug: string;
  /** Whether replies are still open, which decides what an empty list says. */
  invite: boolean;
}) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    void (async () => {
      const outcome = await request(
        controller.signal,
        () =>
          api.GET("/api/events/{slug}/rsvps", {
            params: { path: { slug } },
            signal: controller.signal,
          }),
        "Could not load who is coming.",
      );

      if (outcome.kind === "aborted") return;
      setState(
        outcome.kind === "ok"
          ? { status: "ready", items: outcome.data.items }
          : { status: "error", message: outcome.message },
      );
    })();

    return () => {
      controller.abort();
    };
  }, [slug]);

  if (state.status === "loading") {
    return <Skeleton variant="rounded" height={140} />;
  }

  if (state.status === "error") {
    return <Alert severity="error">{state.message}</Alert>;
  }

  if (state.items.length === 0) {
    return (
      <Typography color="text.secondary">
        {invite ? "Nobody has replied yet. Be the first." : "Nobody replied."}
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      {ORDER.map((status) => {
        const group = state.items.filter((item) => item.status === status);
        if (group.length === 0) return null;

        return (
          <Box key={status}>
            <Typography variant="overline" color="text.secondary">
              {RSVP_LABELS[status]} ({group.length})
            </Typography>
            <Paper variant="outlined">
              <Stack divider={<Divider flexItem />}>
                {group.map((attendee) => (
                  <AttendeeRow key={attendee.userId} attendee={attendee} />
                ))}
              </Stack>
            </Paper>
          </Box>
        );
      })}
    </Stack>
  );
}

function AttendeeRow({ attendee }: { attendee: Attendee }) {
  const detail = [
    attendee.arrivalDate
      ? `Arriving ${formatPlainDate(attendee.arrivalDate)}`
      : null,
    attendee.departureDate
      ? `leaving ${formatPlainDate(attendee.departureDate)}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Stack spacing={0.5} className="p-4">
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        className="flex-wrap items-center"
      >
        <Typography variant="body1">
          {attendee.scaName ?? attendee.name}
        </Typography>
        {/*
          The SCA name is what people are known by at an event, so it leads.
          The legal-ish account name follows only when the two differ, because
          a roster nobody recognises is no use at the gate.
        */}
        {attendee.scaName && attendee.scaName !== attendee.name ? (
          <Typography variant="body2" color="text.secondary">
            ({attendee.name})
          </Typography>
        ) : null}
        {attendee.guestCount > 0 ? (
          <Chip
            size="small"
            variant="outlined"
            label={`+${String(attendee.guestCount)} ${
              attendee.guestCount === 1 ? "guest" : "guests"
            }`}
          />
        ) : null}
      </Stack>

      {detail ? (
        <Typography variant="body2" color="text.secondary">
          {detail}
        </Typography>
      ) : null}

      {attendee.notes ? (
        <Typography variant="body2" color="text.secondary">
          {attendee.notes}
        </Typography>
      ) : null}
    </Stack>
  );
}
