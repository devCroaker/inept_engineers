import { createApiClient } from "@inept/api-client";

/**
 * One client for the whole app. Requests go to the same origin, so the Better
 * Auth session cookie rides along without any token handling here.
 */
export const api = createApiClient();

/**
 * Pulls a readable message out of an API error body.
 *
 * The API always answers failures with `{ error: { code, message } }`, and that
 * message is written for a member to read, so showing it is better than a
 * generic apology. Anything unrecognised falls back.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null || !("error" in error)) {
    return fallback;
  }

  const inner: unknown = error.error;
  if (typeof inner !== "object" || inner === null || !("message" in inner)) {
    return fallback;
  }

  return typeof inner.message === "string" ? inner.message : fallback;
}

export type Outcome<T> =
  | { kind: "aborted" }
  | { kind: "ok"; data: T }
  | { kind: "failed"; status: number; message: string };

interface Result<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/**
 * Runs one API call and reduces it to something a component can switch on.
 *
 * The important part is the abort handling. When an effect cleans up, it aborts
 * its request, and the underlying fetch then *rejects* rather than resolving
 * with an error. Nothing awaits that rejection, so every unmount left an
 * unhandled rejection in the console; under React Strict Mode in development
 * that is every single mount, because effects run twice. An aborted request is
 * not a failure, it is a request nobody is waiting for any more, so it gets its
 * own outcome that callers ignore.
 *
 * `status` is 0 when the request never reached the server, which is how a
 * caller tells "the API said no" from "the API could not be reached".
 */
export async function request<T>(
  signal: AbortSignal,
  send: () => Promise<Result<T>>,
  fallback: string,
): Promise<Outcome<T>> {
  try {
    const { data, error, response } = await send();
    if (signal.aborted) return { kind: "aborted" };
    if (data !== undefined) return { kind: "ok", data };

    return {
      kind: "failed",
      status: response.status,
      message: apiErrorMessage(error, fallback),
    };
  } catch {
    if (signal.aborted) return { kind: "aborted" };
    return { kind: "failed", status: 0, message: fallback };
  }
}
