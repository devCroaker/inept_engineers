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
import { createApiClient } from "@inept/api-client";
import { useEffect, useState } from "react";

import { signOut } from "@/lib/auth-client";

const client = createApiClient();

interface MeState {
  loading: boolean;
  viewer?: {
    name: string;
    email: string;
    membershipLevel: string;
    roles: string[];
    profile: {
      scaName: string | null;
      city: string | null;
      state: string | null;
    } | null;
  };
  signedOut?: boolean;
}

export function MemberCard() {
  const [state, setState] = useState<MeState>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data, error } = await client.GET("/api/me");
      if (cancelled) return;
      if (error || !data) {
        setState({ loading: false, signedOut: true });
        return;
      }
      setState({ loading: false, viewer: data });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return <Skeleton variant="rounded" height={180} />;
  }

  if (state.signedOut || !state.viewer) {
    return (
      <Alert
        severity="info"
        action={
          <Button href="/sign-in" size="small">
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
          <Button
            variant="outlined"
            size="small"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
