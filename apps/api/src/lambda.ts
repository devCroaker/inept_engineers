import { handle } from "hono/aws-lambda";

import { createRootApp } from "./app.js";

/**
 * CloudFront routes /api/* here, and API Gateway forwards the path unchanged,
 * so the app is mounted at /api to match.
 */
export const handler = handle(createRootApp());
