import createOpenApiClient, { type Client } from "openapi-fetch";

import type { components, paths } from "./schema.gen.js";

export type ApiPaths = paths;
export type ApiClient = Client<paths>;

/**
 * Every named schema in the OpenAPI document, so consumers describe API data
 * with the generated types rather than hand-written interfaces that drift.
 */
export type ApiSchemas = components["schemas"];

export type Viewer = ApiSchemas["Viewer"];
export type Role = ApiSchemas["Role"];
export type ApiEvent = ApiSchemas["Event"];
export type Attendee = ApiSchemas["Attendee"];
export type RsvpStatus = ApiSchemas["RsvpStatus"];
export type EventKind = ApiSchemas["EventKind"];
export type EventStatus = ApiSchemas["EventStatus"];

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
