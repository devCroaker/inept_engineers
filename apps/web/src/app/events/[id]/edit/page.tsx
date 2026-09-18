import { Container } from "@mui/material";

import { EditEventLoader } from "@/components/EditEventLoader";
import { ManagerOnly } from "@/components/ManagerOnly";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Container maxWidth="md" className="py-10">
      <ManagerOnly>
        <EditEventLoader id={id} />
      </ManagerOnly>
    </Container>
  );
}
