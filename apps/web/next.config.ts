import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * In production CloudFront serves this app and forwards /api/* to API
   * Gateway, so the browser only ever sees one origin. Locally the API runs on
   * its own port, so the dev server proxies to it to reproduce that exactly.
   *
   * This matters for more than tidiness: the OAuth redirect URIs registered
   * with Google and Discord point at localhost:3000, and the Better Auth
   * session cookie is set for this origin. Talking to :8787 directly would
   * break both.
   */
  // Next requires this to return a Promise, but there is nothing to await, so
  // it returns one directly rather than being declared async.
  rewrites() {
    return Promise.resolve([
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
    ]);
  },
};

export default nextConfig;
