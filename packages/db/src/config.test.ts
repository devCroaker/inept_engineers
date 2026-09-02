import { describe, expect, it } from "vitest";

import { resolveDbConfig } from "./config.js";

describe("resolveDbConfig", () => {
  it("uses the connection string when IAM auth is off", () => {
    const config = resolveDbConfig({
      DATABASE_URL: "postgresql://u:p@localhost:5433/d",
    });

    expect(config.mode).toBe("url");
    expect(config.connectionString).toBe("postgresql://u:p@localhost:5433/d");
  });

  it("switches to IAM mode and reads connection details from the environment", () => {
    const config = resolveDbConfig({
      DB_IAM_AUTH: "true",
      DB_HOST: "db.example.com",
      DB_NAME: "inept",
      DB_USER: "api",
      AWS_REGION: "us-west-2",
    });

    expect(config).toMatchObject({
      mode: "iam",
      host: "db.example.com",
      port: 5432,
      database: "inept",
      user: "api",
      region: "us-west-2",
    });
    // The whole point of IAM mode: there is no password to resolve.
    expect(config).not.toHaveProperty("password");
  });

  it("fails loudly when IAM mode is missing configuration", () => {
    expect(() =>
      resolveDbConfig({ DB_IAM_AUTH: "true", DB_NAME: "x", DB_USER: "y" }),
    ).toThrow(/DB_HOST/);
  });

  it("fails loudly when no database URL is present", () => {
    expect(() => resolveDbConfig({})).toThrow(/DATABASE_URL/);
  });
});
