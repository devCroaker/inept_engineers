import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit runs only locally and in CI, against the Postgres container.
 * Deployed migrations are applied by the migration Lambda using the generated
 * SQL files in ./migrations.
 */
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://inept:localdev@localhost:5432/inept",
  },
});
