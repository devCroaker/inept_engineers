import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { closeDb, getDb } from "./client.js";

/** Overridden in the packaged Lambda, where the layout is flattened. */
const MIGRATIONS_FOLDER =
  process.env.DB_MIGRATIONS_PATH ??
  join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/**
 * Applies any pending migrations. Used by `pnpm db:migrate` locally and by the
 * migration Lambda after each deploy.
 */
export async function runMigrations(): Promise<void> {
  await migrate(getDb(), { migrationsFolder: MIGRATIONS_FOLDER });
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  runMigrations()
    .then(async () => {
      console.warn("Migrations applied successfully.");
      await closeDb();
    })
    .catch(async (error: unknown) => {
      console.error("Migration failed:", error);
      await closeDb();
      process.exitCode = 1;
    });
}
