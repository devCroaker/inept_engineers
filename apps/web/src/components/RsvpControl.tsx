"use client";

import type { ApiEvent, RsvpStatus } from "@inept/api-client";
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { api, request } from "@/lib/api";
import { repliesOpen } from "@/lib/events";
import { RSVP_LABELS, isMultiDay, toDateInput } from "@/lib/format";

const CHOICES: RsvpStatus[] = ["yes", "maybe", "no"];

/** Empty string is what a cleared date input gives back; the API wants null. */
function orNull(value: string): string | null {
  return value === "" ? null : value;
}

export function RsvpControl({
  event,
  onUpdated,
}: {
  event: ApiEvent;
  onUpdated: (event: ApiEvent) => void;
}) {
  const existing = event.viewerRsvp;

  const [status, setStatus] = useState<RsvpStatus | null>(
    existing?.status ?? null,
  );
  const [arrival, setArrival] = useState(existing?.arrivalDate ?? "");
  const [departure, setDeparture] = useState(existing?.departureDate ?? "");
  const [guests, setGuests] = useState(String(existing?.guestCount ?? 0));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  // The API refuses both of these with a 409, so the form is not offered. The
  // cancelled case says nothing, because the banner at the top of the page has
  // already said it.
  if (!repliesOpen(event)) {
    return event.status === "cancelled" ? null : (
      <Typography variant="body2" color="text.secondary">
        This event has finished, so replies are closed.
      </Typography>
    );
  }

  // Arrival and departure only make sense across more than one day. For a
  // single evening, asking when someone is arriving is asking them to repeat
  // the start time back.
  const spansDays = isMultiDay(event.startsAt, event.endsAt);
  const firstDay = toDateInput(event.startsAt);
  const lastDay = event.endsAt ? toDateInput(event.endsAt) : undefined;

  const guestCount = Number.parseInt(guests, 10);
  const guestsValid = Number.isInteger(guestCount) && guestCount >= 0;

  async function save() {
    if (!status || !guestsValid) return;

    setSaving(true);
    setError(undefined);
    setSaved(false);

    const controller = new AbortController();
    const outcome = await request(
      controller.signal,
      () =>
        api.PUT("/api/events/{slug}/rsvp", {
          params: { path: { slug: event.slug } },
          body: {
            status,
            guestCount,
            arrivalDate: spansDays ? orNull(arrival) : null,
            departureDate: spansDays ? orNull(departure) : null,
            notes: orNull(notes.trim()),
          },
        }),
      "Could not save your reply.",
    );

    setSaving(false);
    if (outcome.kind === "ok") {
      setSaved(true);
      // The API answers with the whole event, so the headcount above updates
      // from the server's arithmetic rather than being guessed at here.
      onUpdated(outcome.data);
    } else if (outcome.kind === "failed") {
      setError(outcome.message);
    }
  }

  return (
    <Paper variant="outlined" className="p-5">
      <Stack spacing={2.5}>
        <Typography variant="h2" className="text-xl">
          {existing ? "Your reply" : "Are you coming?"}
        </Typography>

        <ToggleButtonGroup
          exclusive
          value={status}
          onChange={(_, value: RsvpStatus | null) => {
            // Null arrives when the selected button is pressed again. Keeping
            // the current answer is kinder than silently clearing it.
            if (value !== null) setStatus(value);
            setSaved(false);
          }}
          aria-label="Your reply"
        >
          {CHOICES.map((choice) => (
            <ToggleButton key={choice} value={choice}>
              {RSVP_LABELS[choice]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {status && status !== "no" ? (
          <>
            {spansDays ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Arriving"
                  type="date"
                  size="small"
                  value={arrival}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: firstDay, max: lastDay },
                  }}
                  onChange={(e) => {
                    setArrival(e.target.value);
                    setSaved(false);
                  }}
                />
                <TextField
                  label="Leaving"
                  type="date"
                  size="small"
                  value={departure}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: arrival || firstDay, max: lastDay },
                  }}
                  onChange={(e) => {
                    setDeparture(e.target.value);
                    setSaved(false);
                  }}
                />
              </Stack>
            ) : null}

            <TextField
              label="Guests you are bringing"
              type="number"
              size="small"
              value={guests}
              error={!guestsValid}
              helperText={
                guestsValid
                  ? "Counted towards the headcount, so the kitchen knows."
                  : "Enter a whole number, zero or more."
              }
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              onChange={(e) => {
                setGuests(e.target.value);
                setSaved(false);
              }}
              className="sm:max-w-xs"
            />
          </>
        ) : null}

        <TextField
          label="Anything the organisers should know"
          size="small"
          multiline
          minRows={2}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}
        {saved ? <Alert severity="success">Reply saved.</Alert> : null}

        <Stack direction="row" spacing={2} className="items-center">
          <Button
            variant="contained"
            disabled={!status || !guestsValid || saving}
            onClick={() => void save()}
          >
            {saving ? "Saving" : existing ? "Update reply" : "Send reply"}
          </Button>
          {!status ? (
            <Typography variant="caption" color="text.secondary">
              Pick an answer first.
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}
