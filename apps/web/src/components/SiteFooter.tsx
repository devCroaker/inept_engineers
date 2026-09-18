import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import Link from "next/link";

/**
 * Carries the privacy and terms links on every page.
 *
 * Not decoration: Google will not publish the OAuth app unless both are live
 * and reachable, and until it is published members get signed out weekly when
 * their refresh token expires.
 */
export function SiteFooter() {
  return (
    <Box component="footer" className="mt-16">
      <Divider />
      <Container maxWidth="md" className="px-4 py-6">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 3 }}
          className="items-start sm:items-center"
        >
          <Typography variant="body2" color="text.secondary">
            The Inept Engineers
          </Typography>
          <Box className="grow" />
          <Stack direction="row" spacing={3}>
            {/*
              Next's Link wraps the Typography rather than being passed to it as
              `component`. This is a server component, and handing a function
              across to a client component like Typography is not allowed: it
              throws at request time, which no amount of typechecking catches.
            */}
            <Link href="/privacy" className="no-underline">
              <Typography variant="body2" color="text.secondary">
                Privacy
              </Typography>
            </Link>
            <Link href="/terms" className="no-underline">
              <Typography variant="body2" color="text.secondary">
                Terms
              </Typography>
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
