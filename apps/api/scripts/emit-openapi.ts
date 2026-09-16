import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { OPENAPI_INFO, createRootApp } from "../src/app.js";

const outputPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "openapi.json",
);
const document = createRootApp().getOpenAPI31Document(OPENAPI_INFO);

writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.warn(`Wrote ${outputPath}`);
