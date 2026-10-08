import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { artifacts } from "./build";
import { TOKENS, resolve } from "./tokens";

describe("tokens", () => {
  it("uses the brand background and foreground", () => {
    expect(resolve("background", "light")).toBe("#fefefe");
    expect(resolve("background", "dark")).toBe("#0e0e0e");
    expect(resolve("foreground", "light")).toBe("#0e0e0e");
    expect(resolve("foreground", "dark")).toBe("#fefefe");
  });

  it("has unique names", () => {
    const names = TOKENS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("throws on an unknown token", () => {
    expect(() => resolve("nope", "light")).toThrow();
  });
});

describe("generated artifacts", () => {
  for (const [file, build] of Object.entries(artifacts)) {
    it(`${file} is up to date`, () => {
      const committed = readFileSync(path.join(__dirname, "..", "generated", file), "utf8");
      expect(committed).toBe(build());
    });
  }
});
