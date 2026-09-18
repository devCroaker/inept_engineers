import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Load the repository root .env before the tests decide what they can run.
 *
 * Without it the integration tests here see no DATABASE_URL and quietly skip
 * themselves, so a local `pnpm test` reported success while running a weaker
 * suite than CI, which sets the variable in the job environment.
 *
 * loadEnvFile leaves variables that are already set alone, so a real
 * environment still wins over the file.
 */
const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests share one Postgres database, so run them serially.
    fileParallelism: false,
  },
});
