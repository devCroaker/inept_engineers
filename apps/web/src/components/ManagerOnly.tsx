"use client";

import { Alert, Button, Skeleton } from "@mui/material";
import Link from "next/link";
import type { ReactNode } from "react";

import { canManageEvents, useViewer } from "@/lib/viewer";

/**
 * Renders its children only for members who can manage events.
 *
 * This is about what to show, not about what is allowed: the API checks the
 * same policy on every write, so a member who reached this page another way
 * still cannot create anything. It exists so the answer comes from the server's
 * `can` rather than from roles being reinterpreted here.
 */
export function ManagerOnly({ children }: { children: ReactNode }) {
  const state = useViewer();

  if (state.status === "loading") {
    return <Skeleton variant="rounded" height={320} />;
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
        Sign in to continue.
      </Alert>
    );
  }

  if (!canManageEvents(state)) {
    return (
      <Alert
        severity="info"
        action={
          <Button component={Link} href="/events" size="small">
            Back to events
          </Button>
        }
      >
        Only captains, triads, officers, and sisters can add or change events.
      </Alert>
    );
  }

  return <>{children}</>;
}
