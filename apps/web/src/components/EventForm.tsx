"use client";

import type { ApiEvent, EventKind, EventStatus } from "@inept/api-client";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, request } from "@/lib/api";
import {
  EVENT_KIND_LABELS,
  EVENT_STATUS_LABELS,
  fromDateTimeInput,
  toDateTimeInput,
} from "@/lib/format";

const KINDS = Object.keys(EVENT_KIND_LABELS) as EventKind[];
const STATUSES = Object.keys(EVENT_STATUS_LABELS) as EventStatus[];

const STATUS_HELP: Record<EventStatus, string> = {
  draft: "Only visible to people who can manage events.",
  published: "Visible to every member, and open for replies.",
  cancelled: "Stays visible so anyone who replied finds out it is off.",
};

interface Fields {
  title: string;
  kind: EventKind;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  location: string;
  address: string;
  externalRegistrationUrl: string;
  capacity: string;
  description: string;
}

function initialFields(event?: ApiEvent): Fields {
  return {
    title: event?.title ?? "",
    kind: event?.kind ?? "other",
    status: event?.status ?? "draft",
    startsAt: event ? toDateTimeInput(event.startsAt) : "",
    endsAt: event?.endsAt ? toDateTimeInput(event.endsAt) : "",
    location: event?.location ?? "",
    address: event?.address ?? "",
    externalRegistrationUrl: event?.externalRegistrationUrl ?? "",
    capacity: event?.capacity === null ? "" : String(event?.capacity ?? ""),
    description: event?.description ?? "",
  };
}

/** Blank optional text is absence, which the API spells null. */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function problems(fields: Fields): Partial<Record<keyof Fields, string>> {
  const found: Partial<Record<keyof Fields, string>> = {};

  if (fields.title.trim() === "") {
    found.title = "Needed.";
  }

  if (fields.startsAt === "") {
    found.startsAt = "Needed, so members know when to turn up.";
  }

  if (
    fields.endsAt !== "" &&
    fields.startsAt !== "" &&
    new Date(fields.endsAt) < new Date(fields.startsAt)
  ) {
    found.endsAt = "Cannot be before the start.";
  }

  if (fields.capacity !== "") {
    const parsed = Number(fields.capacity);
    if (!Number.isInteger(parsed) || parsed < 1) {
      found.capacity = "A whole number of people, or leave it blank.";
    }
  }

  if (fields.externalRegistrationUrl !== "") {
    try {
      new URL(fields.externalRegistrationUrl);
    } catch {
      found.externalRegistrationUrl = "Include the https:// part.";
    }
  }

  // An empty string is not a problem, so strip the keys that were set to one.
  return Object.fromEntries(
    Object.entries(found).filter(([, value]) => value !== undefined),
  );
}

export function EventForm({ event }: { event?: ApiEvent }) {
  const isNew = event === undefined;
  const router = useRouter();

  const [fields, setFields] = useState<Fields>(() => initialFields(event));
  const [showProblems, setShowProblems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const found = problems(fields);
  const shown = showProblems ? found : {};

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (Object.keys(found).length > 0) {
      setShowProblems(true);
      return;
    }

    setSaving(true);
    setError(undefined);

    const body = {
      title: fields.title.trim(),
      kind: fields.kind,
      status: fields.status,
      startsAt: fromDateTimeInput(fields.startsAt),
      endsAt: fields.endsAt === "" ? null : fromDateTimeInput(fields.endsAt),
      location: orNull(fields.location),
      address: orNull(fields.address),
      externalRegistrationUrl: orNull(fields.externalRegistrationUrl),
      capacity: fields.capacity === "" ? null : Number(fields.capacity),
      description: orNull(fields.description),
    };

    const controller = new AbortController();
    const outcome = await request(
      controller.signal,
      () =>
        isNew
          ? api.POST("/api/events", { body })
          : api.PATCH("/api/events/{id}", {
              params: { path: { id: event.id } },
              body,
            }),
      isNew ? "Could not create the event." : "Could not save your changes.",
    );

    if (outcome.kind === "ok") {
      // Straight to the event itself, which is the thing the organiser wanted.
      router.push(`/events/${outcome.data.id}`);
      router.refresh();
      return;
    }

    setSaving(false);
    if (outcome.kind === "failed") setError(outcome.message);
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h1">
        {isNew ? "New event" : `Editing ${event.title}`}
      </Typography>

      <Paper variant="outlined" className="p-5">
        <Stack spacing={3}>
          <TextField
            label="Title"
            required
            value={fields.title}
            error={Boolean(shown.title)}
            helperText={shown.title}
            onChange={(e) => {
              set("title", e.target.value);
            }}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="Kind"
              value={fields.kind}
              className="sm:w-52"
              onChange={(e) => {
                set("kind", e.target.value as EventKind);
              }}
            >
              {KINDS.map((kind) => (
                <MenuItem key={kind} value={kind}>
                  {EVENT_KIND_LABELS[kind]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Status"
              value={fields.status}
              helperText={STATUS_HELP[fields.status]}
              className="sm:w-72"
              onChange={(e) => {
                set("status", e.target.value as EventStatus);
              }}
            >
              {STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {EVENT_STATUS_LABELS[status]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Starts"
              type="datetime-local"
              required
              value={fields.startsAt}
              error={Boolean(shown.startsAt)}
              helperText={shown.startsAt}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => {
                set("startsAt", e.target.value);
              }}
            />
            <TextField
              label="Ends"
              type="datetime-local"
              value={fields.endsAt}
              error={Boolean(shown.endsAt)}
              helperText={shown.endsAt ?? "Leave blank for a single gathering."}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: fields.startsAt || undefined },
              }}
              onChange={(e) => {
                set("endsAt", e.target.value);
              }}
            />
          </Stack>

          <TextField
            label="Location"
            value={fields.location}
            helperText="The name people would say: Horning's Hideout, the Hall."
            onChange={(e) => {
              set("location", e.target.value);
            }}
          />

          <TextField
            label="Address"
            value={fields.address}
            helperText="What you would put into a map."
            onChange={(e) => {
              set("address", e.target.value);
            }}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Capacity"
              type="number"
              value={fields.capacity}
              error={Boolean(shown.capacity)}
              helperText={shown.capacity ?? "Blank if there is no limit."}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              className="sm:w-44"
              onChange={(e) => {
                set("capacity", e.target.value);
              }}
            />
            <TextField
              label="Official registration link"
              value={fields.externalRegistrationUrl}
              error={Boolean(shown.externalRegistrationUrl)}
              helperText={
                shown.externalRegistrationUrl ??
                "Where members pay the branch, when the event charges a fee."
              }
              className="grow"
              onChange={(e) => {
                set("externalRegistrationUrl", e.target.value);
              }}
            />
          </Stack>

          <TextField
            label="Description"
            multiline
            minRows={4}
            value={fields.description}
            helperText="What to bring, what to expect, who to ask."
            onChange={(e) => {
              set("description", e.target.value);
            }}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              disabled={saving}
              onClick={() => void submit()}
            >
              {saving ? "Saving" : isNew ? "Create event" : "Save changes"}
            </Button>
            <Button
              component={Link}
              href={isNew ? "/events" : `/events/${event.id}`}
              disabled={saving}
            >
              Cancel
            </Button>
          </Stack>

          {showProblems && Object.keys(found).length > 0 ? (
            <Box>
              <Typography variant="body2" color="error">
                Some fields need attention before this can be saved.
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}
