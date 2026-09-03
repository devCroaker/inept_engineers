/**
 * Database connection configuration.
 *
 * Two credential modes are supported:
 *
 * - Local development and CI use a plain `DATABASE_URL` with a password,
 *   backed by the Postgres container in docker-compose.yml.
 * - AWS uses RDS IAM authentication. No database password exists anywhere: a
 *   short lived token is signed locally with SigV4 for each new connection.
 *   That is also why the API Lambda needs no Secrets Manager access, and
 *   therefore no VPC endpoint and no NAT Gateway.
 */
export type DbMode = "url" | "iam";

export interface DbConfig {
  mode: DbMode;
  /** Present when mode is 'url'. */
  connectionString?: string;
  /** Present when mode is 'iam'. */
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  region?: string;
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function resolveDbConfig(
  env: NodeJS.ProcessEnv = process.env,
): DbConfig {
  if (env.DB_IAM_AUTH === "true") {
    return {
      mode: "iam",
      host: requireEnv(env, "DB_HOST"),
      port: Number(env.DB_PORT ?? 5432),
      database: requireEnv(env, "DB_NAME"),
      user: requireEnv(env, "DB_USER"),
      region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? "us-west-2",
    };
  }

  return {
    mode: "url",
    connectionString: requireEnv(env, "DATABASE_URL"),
  };
}
