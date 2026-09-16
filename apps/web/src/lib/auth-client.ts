"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Talks to the API through the same origin. In production CloudFront forwards
 * /api/* to API Gateway; locally the Next dev server proxies it. Either way the
 * session cookie belongs to this origin, which is also what the OAuth redirect
 * URIs registered with Google and Discord point at.
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
});

export const { signIn, signOut, signUp, useSession } = authClient;
