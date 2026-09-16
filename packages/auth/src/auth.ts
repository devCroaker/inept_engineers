import {
  accounts,
  getDb,
  sessions,
  users,
  verifications,
  type Database,
  MEMBERSHIP_LEVELS,
} from "@inept/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { resolveEmailSender, type EmailSender } from "./email.js";

export interface CreateAuthOptions {
  db?: Database;
  emailSender?: EmailSender;
  /** Public origin of the site, used to build links in emails. */
  baseUrl?: string;
  secret?: string;
  env?: NodeJS.ProcessEnv;
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Builds the Better Auth instance.
 *
 * Three sign-in methods land in the same account: email and password, Google,
 * and Discord. The account table holds one row per method.
 *
 * Only Google is a trusted provider for automatic linking. Better Auth links
 * a provider to an existing user when the email matches, so trusting a
 * provider that does not reliably verify email addresses would let someone
 * register there with another person's address and inherit their account,
 * which here includes their medical row. Google reports verification
 * reliably; Discord does not, and its email can be null entirely. Discord and
 * password are therefore linked deliberately from account settings instead.
 */
export function createAuth(options: CreateAuthOptions = {}) {
  const env = options.env ?? process.env;
  const db = options.db ?? getDb();
  const emailSender = options.emailSender ?? resolveEmailSender(env);
  const baseUrl =
    options.baseUrl ?? env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return betterAuth({
    secret: options.secret ?? requireEnv(env, "BETTER_AUTH_SECRET"),
    baseURL: baseUrl,

    // Our tables are exported with plural names, Better Auth expects singular
    // model names, so the mapping is explicit rather than relying on usePlural.
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await emailSender.send({
          to: user.email,
          subject: "Reset your Inept Engineers password",
          text: `Someone asked to reset the password for this account.\n\nReset it here:\n${url}\n\nIf that was not you, ignore this email and nothing will change.`,
        });
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await emailSender.send({
          to: user.email,
          subject: "Confirm your email for Inept Engineers",
          text: `Welcome to the Inept Engineers.\n\nConfirm your email address here:\n${url}\n\nIf you did not create this account, ignore this email.`,
        });
      },
    },

    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      },
      discord: {
        clientId: env.DISCORD_CLIENT_ID ?? "",
        clientSecret: env.DISCORD_CLIENT_SECRET ?? "",
      },
    },

    account: {
      accountLinking: {
        enabled: true,
        // Google only. See the note above this function.
        trustedProviders: ["google"],
      },
    },

    user: {
      additionalFields: {
        membershipLevel: {
          type: MEMBERSHIP_LEVELS as unknown as [string, ...string[]],
          defaultValue: "foe",
          required: false,
          // Nobody promotes themselves. Advancement through the sponsorship
          // process is done by an officer through the members API.
          input: false,
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
