"use client";

import type { Viewer } from "@inept/api-client";
import { atom, useAtomValue, useSetAtom } from "jotai";

export type ViewerState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; viewer: Viewer };

/**
 * The signed-in member, fetched once by ViewerLoader and read everywhere else.
 *
 * Holding it in Jotai rather than fetching per component means the header and
 * the page agree about who is signed in, and /api/me is requested once per page
 * load instead of once per component that cares.
 */
export const viewerAtom = atom<ViewerState>({ status: "loading" });

export function useViewer(): ViewerState {
  return useAtomValue(viewerAtom);
}

export function useSetViewer() {
  return useSetAtom(viewerAtom);
}

/** The viewer when signed in, otherwise undefined. */
export function viewerOrUndefined(state: ViewerState): Viewer | undefined {
  return state.status === "signedIn" ? state.viewer : undefined;
}

/**
 * Whether the viewer may manage events.
 *
 * Read from the server's answer rather than worked out from roles here. The
 * rules live in the access policy in @inept/db; duplicating them in the browser
 * would let the two drift and show buttons that fail when pressed.
 */
export function canManageEvents(state: ViewerState): boolean {
  return viewerOrUndefined(state)?.can.manageEvents ?? false;
}
