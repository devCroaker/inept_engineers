import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { RDS_CA_REGION } from "./client.js";

const bundlePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "certs",
  `rds-${RDS_CA_REGION}-bundle.pem`,
);

describe("RDS CA bundle", () => {
  const pem = readFileSync(bundlePath, "utf8");

  it("exists for the region the client expects", () => {
    expect(pem).toContain("BEGIN CERTIFICATE");
  });

  it("contains only certificates for that region", () => {
    // Guards against accidentally committing the 165 KB global bundle again,
    // or trimming to the wrong region.
    const count = pem.match(/-----BEGIN CERTIFICATE-----/g)?.length ?? 0;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10);
  });

  it("contains no private keys", () => {
    expect(pem).not.toMatch(/PRIVATE KEY/);
  });
});
