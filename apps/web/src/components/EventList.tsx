"use client";

import type { ApiEvent } from "@inept/api-client";
import {
  Alert,
  Button,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EventCard } from "@/components/EventCard";
import { api, request } from "@/lib/api";
import { useViewer } from "@/lib/viewer";

type When = "upcoming" | "past";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ApiEvent[] };

export function EventList() {
  const viewerState = useViewer();
  const [when, setWhen] = useState<When>("upcoming");
  const [state, setState] = useState<State>({ status: "loading" });

  const signedIn = viewerState.status === "signedIn";

  useEffect(() => {
    if (!signedIn) return;

    const controller = new AbortController();
    setState({ status: "loading" });

    void (async () => {
      const outcome = await request(
        controller.signal,
        () =>
          api.GET("/api/events", {
            params: { query: { when } },
            signal: controller.signal,
          }),
        "Could not load events.",
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
  }, [when, signedIn]);

  if (viewerState.status === "loading") {
    return <Skeleton variant="rounded" height={160} />;
  }

  // Events are not public. Nothing about them is shown to a signed-out visitor,
  // including whether any exist.
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
        Sign in to see what the household has coming up.
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <Tabs
        value={when}
        onChange={(_, value: When) => {
          setWhen(value);
        }}
        aria-label="Which events to show"
      >
        <Tab value="upcoming" label="Upcoming" />
        <Tab value="past" label="Past" />
      </Tabs>

      {state.status === "loading" ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={140} />
          <Skeleton variant="rounded" height={140} />
        </Stack>
      ) : state.status === "error" ? (
        <Alert severity="error">{state.message}</Alert>
      ) : state.items.length === 0 ? (
        <Typography color="text.secondary">
          {when === "upcoming"
            ? "Nothing on the calendar yet."
            : "No past events recorded."}
        </Typography>
      ) : (
        <Stack spacing={2}>
          {state.items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
