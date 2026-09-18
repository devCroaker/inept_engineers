import { Container } from "@mui/material";
import type { Metadata } from "next";

import { EventForm } from "@/components/EventForm";
import { ManagerOnly } from "@/components/ManagerOnly";

export const metadata: Metadata = {
  title: "New event",
};

export default function NewEventPage() {
  return (
    <Container maxWidth="md" className="py-10">
      <ManagerOnly>
        <EventForm />
      </ManagerOnly>
    </Container>
  );
}
