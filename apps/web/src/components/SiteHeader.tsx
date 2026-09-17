"use client";

import {
  AppBar,
  Box,
  Button,
  Container,
  Skeleton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/lib/auth-client";
import { useViewer, viewerOrUndefined } from "@/lib/viewer";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
];

export function SiteHeader() {
  const state = useViewer();
  const viewer = viewerOrUndefined(state);
  const pathname = usePathname();

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Container maxWidth="md" disableGutters>
        <Toolbar className="gap-2 px-4 sm:gap-4">
          <Typography
            component={Link}
            href="/"
            variant="h6"
            // Kept on one line and stepped down on narrow screens: wrapped to
            // two lines the brand pushed the whole header out of shape.
            className="text-base font-bold whitespace-nowrap no-underline sm:text-xl"
            color="text.primary"
          >
            Inept Engineers
          </Typography>

          <Stack direction="row" spacing={1} component="nav">
            {NAV.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                size="small"
                // The current section is marked with weight rather than colour
                // so it still reads for anyone who cannot distinguish the two.
                className={pathname === item.href ? "font-bold" : "font-normal"}
                color={pathname === item.href ? "primary" : "inherit"}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <Box className="grow" />

          {state.status === "loading" ? (
            <Skeleton variant="rounded" width={96} height={32} />
          ) : viewer ? (
            <Button size="small" onClick={() => void signOut()}>
              Sign out
            </Button>
          ) : (
            <Button
              component={Link}
              href="/sign-in"
              size="small"
              variant="contained"
            >
              Sign in
            </Button>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
