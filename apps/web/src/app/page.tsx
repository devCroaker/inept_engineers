import { Box, Container, Stack, Typography } from "@mui/material";

import { MemberCard } from "@/components/MemberCard";

export default function HomePage() {
  return (
    <Container maxWidth="sm" className="py-12">
      <Stack spacing={4}>
        <Box>
          {/* Tailwind handles layout and spacing; MUI provides the components. */}
          <Typography variant="h1" className="tracking-tight">
            Inept Engineers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Events, attendance, and camp coordination.
          </Typography>
        </Box>

        <MemberCard />
      </Stack>
    </Container>
  );
}
