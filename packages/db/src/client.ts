import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Signer } from "@aws-sdk/rds-signer";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import { resolveDbConfig, type DbConfig } from "./config.js";
import * as schema from "./schema/index.js";

export type Database = NodePgDatabase<typeof schema>;

/**
 * The committed CA bundle is trimmed to a single region to keep the Lambda
 * bundle small. See certs/README.md for what it is and how to regenerate it.
 */
export const RDS_CA_REGION = "us-west-2";

/**
 * Bundlers flatten the output directory, so the packaged Lambda sets
 * DB_CA_BUNDLE_PATH explicitly. The relative path is the local default.
 */
const CA_BUNDLE_PATH =
  process.env.DB_CA_BUNDLE_PATH ??
  join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "certs",
    `rds-${RDS_CA_REGION}-bundle.pem`,
  );

let cachedCa: string | undefined;

function rdsCaBundle(): string {
  cachedCa ??= readFileSync(CA_BUNDLE_PATH, "utf8");
  return cachedCa;
}

function buildPoolConfig(config: DbConfig): pg.PoolConfig {
  if (config.mode === "url") {
    return { connectionString: config.connectionString };
  }

  // The bundle only contains roots for one region, so connecting elsewhere
  // would fail with an opaque TLS handshake error. Say why instead.
  if (config.region !== RDS_CA_REGION) {
    throw new Error(
      `Database region "${config.region}" does not match the committed CA bundle ` +
        `region "${RDS_CA_REGION}". Regenerate it with ` +
        `"pnpm --filter @inept/db ca:fetch ${config.region}" and update RDS_CA_REGION.`,
    );
  }

  const signer = new Signer({
    hostname: config.host!,
    port: config.port!,
    username: config.user!,
    region: config.region,
  });

  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    // pg accepts an async supplier, so every new physical connection gets a
    // freshly signed token. IAM tokens expire after 15 minutes.
    password: () => signer.getAuthToken(),
    ssl: {
      // Verify against the real RDS certificate chain rather than disabling
      // verification, which is the usual shortcut here.
      ca: rdsCaBundle(),
      rejectUnauthorized: true,
    },
    // Lambda handles one request at a time per container, so a small pool is
    // correct and protects a t4g.micro from connection storms.
    max: Number(process.env.DB_POOL_MAX ?? 2),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}

let pool: pg.Pool | undefined;
let db: Database | undefined;

/**
 * Returns a process-wide pool. Cached at module scope so warm Lambda
 * invocations reuse established connections instead of reconnecting.
 */
export function getPool(): pg.Pool {
  pool ??= new pg.Pool(buildPoolConfig(resolveDbConfig()));
  return pool;
}

export function getDb(): Database {
  db ??= drizzle(getPool(), { schema });
  return db;
}

/** Closes the pool. For tests and one-shot scripts, not request paths. */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
  }
}
