"use client";

import { useEffect } from "react";

import { api, request } from "@/lib/api";
import { useSetViewer } from "@/lib/viewer";

/**
 * Resolves the session once per page load and puts the result in the viewer
 * atom. Renders nothing; it exists so that components can read who is signed in
 * without each one issuing its own request.
 *
 * A 401 here is the ordinary signed-out case rather than a failure. So is a
 * request that never reached the API: there is nothing a member can do about it
 * beyond signing in again, and showing the signed-out state is both honest and
 * actionable.
 */
export function ViewerLoader() {
  const setViewer = useSetViewer();

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      const outcome = await request(
        controller.signal,
        () => api.GET("/api/me", { signal: controller.signal }),
        "Could not check who is signed in.",
      );

      if (outcome.kind === "aborted") return;
      setViewer(
        outcome.kind === "ok"
          ? { status: "signedIn", viewer: outcome.data }
          : { status: "signedOut" },
      );
    })();

    return () => {
      controller.abort();
    };
  }, [setViewer]);

  return null;
}
