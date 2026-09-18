"use client";

import type { ApiEvent } from "@inept/api-client";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Link as MuiLink,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AttendeeRoster } from "@/components/AttendeeRoster";
import { RsvpControl } from "@/components/RsvpControl";
import { api, request } from "@/lib/api";
import { repliesOpen } from "@/lib/events";
import {
  EVENT_KIND_LABELS,
  RSVP_LABELS,
  formatEventDates,
  formatHeadcount,
} from "@/lib/format";
import { canManageEvents, useViewer } from "@/lib/viewer";

type State =
  | { status: "loading" }
  | { status: "error"; message: string; notFound: boolean }
  | { status: "ready"; event: ApiEvent };

export function EventDetail({ slug }: { slug: string }) {
  const viewerState = useViewer();
  const [state, setState] = useState<State>({ status: "loading" });
  // Bumped after a reply is saved, which remounts the roster so it reloads.
  const [replyCount, setReplyCount] = useState(0);

  const signedIn = viewerState.status === "signedIn";

  useEffect(() => {
    if (!signedIn) return;

    const controller = new AbortController();
    setState({ status: "loading" });

    void (async () => {
      const outcome = await request(
        controller.signal,
        () =>
          api.GET("/api/events/{slug}", {
            params: { path: { slug } },
            signal: controller.signal,
          }),
        "Could not load this event.",
      );

      if (outcome.kind === "aborted") return;
      setState(
        outcome.kind === "ok"
          ? { status: "ready", event: outcome.data }
          : {
              status: "error",
              notFound: outcome.status === 404,
              message: outcome.message,
            },
      );
    })();

    return () => {
      controller.abort();
    };
  }, [slug, signedIn]);

  if (viewerState.status === "loading" || state.status === "loading") {
    return <Skeleton variant="rounded" height={280} />;
  }

  if (viewerState.status === "signedOut") {
    return (
      <Alert
        severity="info"
        action={
          <Button component={Link} href="/sign-in" size="small">
            Sign in
          </Button>
        }
      >
        Sign in to see this event.
      </Alert>
    );
  }

  if (state.status === "error") {
    return (
      <Stack spacing={2}>
        <Alert severity={state.notFound ? "info" : "error"}>
          {state.notFound ? "No such event." : state.message}
        </Alert>
        <Box>
          <Button component={Link} href="/events" size="small">
            Back to events
          </Button>
        </Box>
      </Stack>
    );
  }

  const { event } = state;

  return (
    <Stack spacing={3}>
      {event.status === "cancelled" ? (
        <Alert severity="warning">
          This event has been cancelled.
          {event.viewerRsvp
            ? " You had replied, so it may still be on your calendar."
            : ""}
        </Alert>
      ) : null}

      {event.status === "draft" ? (
        <Alert severity="info">
          This event is still a draft. Members cannot see it yet.
        </Alert>
      ) : null}

      <Box>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          className="mb-2 flex-wrap"
        >
          <Chip
            label={EVENT_KIND_LABELS[event.kind]}
            size="small"
            variant="outlined"
          />
          {event.viewerRsvp ? (
            <Chip
              label={`You: ${RSVP_LABELS[event.viewerRsvp.status]}`}
              size="small"
              color="primary"
            />
          ) : null}
        </Stack>

        <Typography variant="h1">{event.title}</Typography>
        <Typography variant="body1" color="text.secondary">
          {formatEventDates(event.startsAt, event.endsAt)}
        </Typography>
      </Box>

      {event.description ? (
        <Typography variant="body1" className="whitespace-pre-wrap">
          {event.description}
        </Typography>
      ) : null}

      <Paper variant="outlined" className="p-5">
        <Stack spacing={1.5} divider={<Divider flexItem />}>
          {event.location ? (
            <Detail label="Where">
              {event.location}
              {event.address ? (
                <Typography variant="body2" color="text.secondary">
                  {event.address}
                </Typography>
              ) : null}
            </Detail>
          ) : null}

          <Detail label="Expected">{formatHeadcount(event.attendance)}</Detail>

          {event.capacity !== null ? (
            <Detail label="Capacity">{`${String(event.capacity)} people`}</Detail>
          ) : null}

          {event.externalRegistrationUrl ? (
            <Detail label="Official registration">
              {/*
                This site does not take money for events the SCA runs. When a
                branch charges its own fee, the member registers there, and this
                link is how they get to it.
              */}
              <MuiLink
                href={event.externalRegistrationUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                Register with the event organisers
              </MuiLink>
            </Detail>
          ) : null}
        </Stack>
      </Paper>

      <RsvpControl
        event={event}
        onUpdated={(updated) => {
          setState({ status: "ready", event: updated });
          setReplyCount((count) => count + 1);
        }}
      />

      <Box>
        <Typography variant="h2" className="mb-3 text-xl">
          Who is coming
        </Typography>
        <AttendeeRoster
          key={replyCount}
          slug={event.slug}
          invite={repliesOpen(event)}
        />
      </Box>

      <Stack direction="row" spacing={2}>
        <Button component={Link} href="/events" size="small">
          Back to events
        </Button>
        {canManageEvents(viewerState) ? (
          <Button
            component={Link}
            href={`/events/${event.slug}/edit`}
            size="small"
            variant="outlined"
          >
            Edit event
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" component="div">
        {children}
      </Typography>
    </Box>
  );
}
