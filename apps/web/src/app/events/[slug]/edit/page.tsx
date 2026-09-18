import { Container } from "@mui/material";

import { EditEventLoader } from "@/components/EditEventLoader";
import { ManagerOnly } from "@/components/ManagerOnly";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Container maxWidth="md" className="py-10">
      <ManagerOnly>
        <EditEventLoader slug={slug} />
      </ManagerOnly>
    </Container>
  );
}
