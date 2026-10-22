#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { artifacts } from "../src/build.ts";

const OUT_DIR = path.resolve(import.meta.dirname, "..", "generated");
mkdirSync(OUT_DIR, { recursive: true });

for (const [file, build] of Object.entries(artifacts)) {
  writeFileSync(path.join(OUT_DIR, file), build());
  console.log(`wrote generated/${file}`);
}
