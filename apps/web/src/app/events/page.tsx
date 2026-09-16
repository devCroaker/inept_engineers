import { Container, Stack, Typography } from "@mui/material";
import type { Metadata } from "next";

import { EventList } from "@/components/EventList";

export const metadata: Metadata = {
  title: "Events",
};

export default function EventsPage() {
  return (
    <Container maxWidth="md" className="py-10">
      <Stack spacing={4}>
        <Typography variant="h1">Events</Typography>
        <EventList />
      </Stack>
    </Container>
  );
}
