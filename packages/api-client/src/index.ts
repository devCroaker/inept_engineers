import createOpenApiClient, { type Client } from "openapi-fetch";

import type { paths } from "./schema.gen.js";

export type ApiPaths = paths;
export type ApiClient = Client<paths>;

export interface CreateApiClientOptions {
  /**
   * Base URL of the API. Normally left undefined in the browser so requests go
   * to the same origin, which is how CloudFront routes /api/* in production and
   * how the Next.js dev server proxies it locally.
   */
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

/**
 * Authentication rides on the Better Auth session cookie rather than a bearer
 * token, so credentials must be included for same-origin requests to carry it.
 */
export function createApiClient(
  options: CreateApiClientOptions = {},
): ApiClient {
  const { baseUrl = "", fetch } = options;

  return createOpenApiClient<paths>({
    baseUrl,
    fetch,
    credentials: "include",
  });
}
