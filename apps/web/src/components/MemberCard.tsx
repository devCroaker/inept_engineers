"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";

import { useViewer } from "@/lib/viewer";

export function MemberCard() {
  const state = useViewer();

  if (state.status === "loading") {
    return <Skeleton variant="rounded" height={180} />;
  }

  if (state.status === "signedOut") {
    return (
      <Alert
        severity="info"
        action={
          <Button component={Link} href="/sign-in" size="small">
            Sign in
          </Button>
        }
      >
        You are not signed in.
      </Alert>
    );
  }

  const { viewer } = state;

  return (
    <Paper variant="outlined" className="p-6">
      <Stack spacing={2}>
        <Box>
          <Typography variant="h2">
            {viewer.profile?.scaName ?? viewer.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {viewer.email}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap className="flex-wrap">
          <Chip
            label={
              viewer.membershipLevel === "foe"
                ? "Friend of Engineers"
                : "Member"
            }
            color="primary"
            size="small"
          />
          {viewer.roles.map((role) => (
            <Chip key={role} label={role} variant="outlined" size="small" />
          ))}
          {viewer.roles.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No roles yet
            </Typography>
          ) : null}
        </Stack>

        {viewer.profile?.city ? (
          <Typography variant="body2">
            {viewer.profile.city}
            {viewer.profile.state ? `, ${viewer.profile.state}` : ""}
          </Typography>
        ) : null}

        <Box>
          <Button component={Link} href="/events" variant="contained">
            See what is coming up
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
