"use client";

import type { ApiEvent } from "@inept/api-client";
import { Alert, Box, Button, Skeleton, Stack } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EventForm } from "@/components/EventForm";
import { api, request } from "@/lib/api";
import { useViewer } from "@/lib/viewer";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; event: ApiEvent };

/** Fetches the event so the form opens with what is already there. */
export function EditEventLoader({ id }: { id: string }) {
  const viewerState = useViewer();
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
          api.GET("/api/events/{id}", {
            params: { path: { id } },
            signal: controller.signal,
          }),
        "Could not load this event.",
      );

      if (outcome.kind === "aborted") return;
      setState(
        outcome.kind === "ok"
          ? { status: "ready", event: outcome.data }
          : { status: "error", message: outcome.message },
      );
    })();

    return () => {
      controller.abort();
    };
  }, [id, signedIn]);

  if (state.status === "loading") {
    return <Skeleton variant="rounded" height={320} />;
  }

  if (state.status === "error") {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{state.message}</Alert>
        <Box>
          <Button component={Link} href="/events" size="small">
            Back to events
          </Button>
        </Box>
      </Stack>
    );
  }

  return <EventForm event={state.event} />;
}
