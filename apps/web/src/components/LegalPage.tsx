import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

/**
 * Shared shell for the privacy policy and the terms.
 *
 * Both are plain server components with no session check. That is deliberate
 * and not an oversight: Google will not approve the OAuth app unless the
 * privacy policy is reachable without signing in, and a policy you have to
 * agree to terms to read is no use to anyone deciding whether to sign up.
 */
export function LegalPage({
  title,
  updated,
  summary,
  children,
}: {
  title: string;
  updated: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <Container maxWidth="md" className="py-10">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h1">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated {updated}
          </Typography>
        </Box>

        <Typography variant="body1">{summary}</Typography>

        <Divider />

        <Stack spacing={4}>{children}</Stack>
      </Stack>
    </Container>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <Box component="section">
      <Typography variant="h2" className="mb-2 text-xl">
        {heading}
      </Typography>
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <Typography variant="body1">{children}</Typography>;
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <Box component="ul" className="my-0 list-disc space-y-1 pl-6">
      {items.map((item, index) => (
        <Typography component="li" variant="body1" key={index}>
          {item}
        </Typography>
      ))}
    </Box>
  );
}
