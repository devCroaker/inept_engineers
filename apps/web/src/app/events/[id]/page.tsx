import { Container } from "@mui/material";

import { EventDetail } from "@/components/EventDetail";

/**
 * The event itself is fetched in the browser rather than here, so that one
 * session cookie and one API client serve the whole app. Rendering it on the
 * server would mean forwarding cookies by hand and calling the API by its
 * internal origin, which the rewrite in next.config.ts exists to avoid.
 */
export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Container maxWidth="md" className="py-10">
      <EventDetail id={id} />
    </Container>
  );
}
