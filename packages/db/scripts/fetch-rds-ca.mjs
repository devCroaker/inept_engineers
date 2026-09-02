/**
 * Regenerates the trimmed RDS certificate authority bundle.
 *
 * AWS publishes one global bundle containing the root CAs for every region,
 * which is roughly 165 KB and 108 certificates. We only ever connect to one
 * region, so this filters it down to that region's roots and writes them to
 * certs/rds-<region>-bundle.pem.
 *
 * Usage:
 *   node scripts/fetch-rds-ca.mjs             # defaults to us-west-2
 *   node scripts/fetch-rds-ca.mjs eu-west-1
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GLOBAL_BUNDLE_URL =
  "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem";

const region = process.argv[2] ?? "us-west-2";
const here = dirname(fileURLToPath(import.meta.url));
const outputPath = join(here, "..", "certs", `rds-${region}-bundle.pem`);

const response = await fetch(GLOBAL_BUNDLE_URL);
if (!response.ok) {
  throw new Error(
    `Failed to download ${GLOBAL_BUNDLE_URL}: ${response.status}`,
  );
}
const bundle = await response.text();

const certificates = bundle.match(
  /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
);
if (!certificates) {
  throw new Error("No certificates found in the downloaded bundle.");
}

/** Reads a certificate subject so we can keep only one region's roots. */
function subjectOf(pem) {
  return execFileSync("openssl", ["x509", "-noout", "-subject"], {
    input: pem,
    encoding: "utf8",
  }).trim();
}

const matching = certificates.filter((pem) => subjectOf(pem).includes(region));
if (matching.length === 0) {
  throw new Error(`No certificates matched region "${region}".`);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${matching.join("\n")}\n`, "utf8");

console.warn(
  `Wrote ${matching.length} certificates for ${region} to ${outputPath}`,
);
for (const pem of matching) {
  console.warn(`  ${subjectOf(pem).replace(/^subject=\s*/, "")}`);
}
