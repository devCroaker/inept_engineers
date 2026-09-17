import type { ApiEvent } from "@inept/api-client";
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";

import {
  EVENT_KIND_LABELS,
  RSVP_LABELS,
  formatEventDates,
  formatHeadcount,
} from "@/lib/format";

/**
 * Colour carries no information on its own here: every chip is also labelled.
 * A cancelled event still appears in the list on purpose, because someone who
 * already replied needs to find out it was called off.
 */
const STATUS_CHIP = {
  draft: { label: "Draft", color: "warning" },
  cancelled: { label: "Cancelled", color: "error" },
} as const;

export function EventCard({ event }: { event: ApiEvent }) {
  const status =
    event.status === "published" ? undefined : STATUS_CHIP[event.status];

  return (
    <Card variant="outlined">
      <CardActionArea component={Link} href={`/events/${event.slug}`}>
        <Stack spacing={1.5} className="p-5">
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            className="flex-wrap items-center"
          >
            <Chip
              label={EVENT_KIND_LABELS[event.kind]}
              size="small"
              variant="outlined"
            />
            {status ? (
              <Chip label={status.label} size="small" color={status.color} />
            ) : null}
            {event.viewerRsvp ? (
              <Chip
                label={`You: ${RSVP_LABELS[event.viewerRsvp.status]}`}
                size="small"
                color="primary"
                variant="filled"
              />
            ) : null}
          </Stack>

          <Box>
            <Typography
              variant="h2"
              className="text-xl"
              sx={
                event.status === "cancelled"
                  ? { textDecoration: "line-through" }
                  : undefined
              }
            >
              {event.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatEventDates(event.startsAt, event.endsAt)}
              {event.location ? ` at ${event.location}` : ""}
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary">
            {formatHeadcount(event.attendance)}
          </Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
