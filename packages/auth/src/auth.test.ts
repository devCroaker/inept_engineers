import { describe, expect, it } from "vitest";

import { createAuth } from "./auth.js";

const env: NodeJS.ProcessEnv = {
  BETTER_AUTH_SECRET: "test-secret-not-used-anywhere-real",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  DISCORD_CLIENT_ID: "discord-id",
  DISCORD_CLIENT_SECRET: "discord-secret",
};

// A stub is enough: these assertions are about configuration, not queries.
const db = {} as never;

describe("createAuth", () => {
  it("refuses to start without a signing secret", () => {
    expect(() =>
      createAuth({ db, env: { ...env, BETTER_AUTH_SECRET: undefined } }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("enables all three sign-in methods", () => {
    const auth = createAuth({ db, env });
    const options = auth.options;

    expect(options.emailAndPassword?.enabled).toBe(true);
    expect(options.socialProviders?.google).toBeDefined();
    expect(options.socialProviders?.discord).toBeDefined();
  });

  it("requires email verification before a password account is usable", () => {
    const auth = createAuth({ db, env });
    expect(auth.options.emailAndPassword?.requireEmailVerification).toBe(true);
  });

  /**
   * The security decision this package exists to get right. Better Auth links
   * a provider to an existing user when the email matches, so trusting a
   * provider that does not reliably verify email would let someone register
   * there with another member's address and inherit their account, including
   * their medical row.
   */
  it("trusts Google for automatic linking and nothing else", () => {
    const auth = createAuth({ db, env });
    const linking = auth.options.account?.accountLinking;

    expect(linking?.enabled).toBe(true);
    expect(linking?.trustedProviders).toEqual(["google"]);
    expect(linking?.trustedProviders).not.toContain("discord");
    expect(linking?.trustedProviders).not.toContain("email-password");
  });

  it("defaults new accounts to foe and refuses to accept it as user input", () => {
    const auth = createAuth({ db, env });
    const field = auth.options.user?.additionalFields?.membershipLevel;

    expect(field?.defaultValue).toBe("foe");
    // Otherwise a sign-up request could name its own membership level.
    expect(field?.input).toBe(false);
  });
});
