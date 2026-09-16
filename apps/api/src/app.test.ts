import { beforeAll, describe, expect, it } from "vitest";

// Better Auth refuses to construct without a secret, and the app builds it
// lazily on first request, so this must be set before the app is created.
process.env.BETTER_AUTH_SECRET ??= "test-secret-not-used-anywhere-real";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "postgresql://inept:localdev@localhost:5433/inept";

// Must be set here, not inside a test. Better Auth is constructed lazily on the
// first request, so by the time a later test runs it has already been built and
// cached, and setting these then has no effect.
process.env.GOOGLE_CLIENT_ID ??= "test-google-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-google-secret";
process.env.DISCORD_CLIENT_ID ??= "test-discord-id";
process.env.DISCORD_CLIENT_SECRET ??= "test-discord-secret";

const { createRootApp } = await import("./app.js");

let app: ReturnType<typeof createRootApp>;

beforeAll(() => {
  app = createRootApp();
});

describe("routing", () => {
  it("serves the OpenAPI document under /api", async () => {
    const res = await app.request("/api/doc");
    expect(res.status).toBe(200);

    const doc = (await res.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(doc.openapi).toBe("3.1.0");
    // Guards against the basePath() trap, where the document silently comes
    // back with no paths at all.
    expect(Object.keys(doc.paths)).toContain("/api/me");
  });

  it("returns the shared error envelope for unknown routes", async () => {
    const res = await app.request("/api/definitely-not-a-route");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "not_found", message: "No such route." },
    });
  });
});

describe("authentication", () => {
  it("refuses /me when signed out", async () => {
    const res = await app.request("/api/me");
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "unauthorized" } });
  });

  it("refuses /me when the session cookie is garbage", async () => {
    const res = await app.request("/api/me", {
      headers: { cookie: "better-auth.session_token=not-a-real-token" },
    });
    expect(res.status).toBe(401);
  });

  it("mounts the Better Auth handler", async () => {
    const res = await app.request("/api/auth/ok");
    expect(res.status).toBe(200);
  });
});

describe("social sign-in", () => {
  /**
   * Proves the configured providers produce authorize URLs pointing at the
   * right place, with the redirect URI that is registered with each provider.
   * A mismatch here is the single most common cause of a broken OAuth setup.
   */
  it.each([
    [
      "google",
      "accounts.google.com",
      "http://localhost:3000/api/auth/callback/google",
    ],
    [
      "discord",
      "discord.com",
      "http://localhost:3000/api/auth/callback/discord",
    ],
  ])("builds a valid %s authorize URL", async (provider, host, redirectUri) => {
    const res = await app.request("/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, callbackURL: "http://localhost:3000/" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { url?: string };
    expect(body.url).toBeDefined();

    const url = new URL(body.url!);
    expect(url.host).toContain(host);
    expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
  });
});
