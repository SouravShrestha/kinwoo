#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const failures = [];

const fail = (message) => failures.push(message);

function readJson(relative) {
  const full = path.join(ROOT, relative);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, "utf8"));
}

function checkExports(pkgDir, pkg) {
  for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
    if (subpath.includes("*")) continue;
    if (!existsSync(path.join(ROOT, pkgDir, target))) {
      fail(`${pkgDir} exports "${subpath}" -> "${target}", which does not exist`);
    }
  }
}

function checkNoDeps(pkgDir, pkg, fields, reason) {
  for (const field of fields) {
    const value = pkg[field];
    if (value && Object.keys(value).length > 0) {
      fail(`${pkgDir} declares ${field}: ${Object.keys(value).join(", ")}. ${reason}`);
    }
  }
}

const core = readJson("packages/core/package.json");
if (!core) {
  fail("packages/core/package.json is missing");
} else {
  checkNoDeps(
    "packages/core",
    core,
    ["dependencies", "peerDependencies", "optionalDependencies"],
    "core must stay dependency-free so it runs on Hermes, browsers and Workers.",
  );
  checkExports("packages/core", core);
}

const tokens = readJson("packages/tokens/package.json");
if (!tokens) {
  fail("packages/tokens/package.json is missing");
} else {
  checkNoDeps(
    "packages/tokens",
    tokens,
    ["dependencies", "peerDependencies"],
    "tokens must stay dependency-free.",
  );
  checkExports("packages/tokens", tokens);
}

const client = readJson("packages/client/package.json");
if (!client) {
  fail("packages/client/package.json is missing");
} else {
  const unexpected = Object.keys(client.dependencies ?? {}).filter((d) => d !== "@kinwoo/core");
  if (unexpected.length > 0) {
    fail(
      `packages/client declares unexpected dependencies: ${unexpected.join(", ")}. ` +
        `Only @kinwoo/core is allowed; everything else must be a peerDependency.`,
    );
  }
  checkExports("packages/client", client);
}

const icons = readJson("packages/icons/package.json");
if (icons) checkExports("packages/icons", icons);

const root = readJson("package.json");
if (!root?.workspaces?.length) fail("the root package.json declares no workspaces");

if (failures.length > 0) {
  console.error(`\n${failures.length} boundary violation(s):\n`);
  for (const f of failures) console.error(`  - ${f}\n`);
  process.exit(1);
}

console.log("boundaries ok");
