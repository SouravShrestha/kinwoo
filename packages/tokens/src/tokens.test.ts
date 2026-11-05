import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { artifacts } from "./build";
import { TOKENS, resolve } from "./tokens";

describe("tokens", () => {
  it("uses the brand background and foreground", () => {
    expect(resolve("background", "light")).toBe("#fefefe");
    expect(resolve("background", "dark")).toBe("#0e0e0e");
    expect(resolve("foreground", "light")).toBe("#1e1240");
    expect(resolve("foreground", "dark")).toBe("#f5f5f5");
  });

  it("has unique names", () => {
    const names = TOKENS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("applies palette overrides and falls back to the base token", () => {
    expect(resolve("accent", "light", "skyscanner")).toBe("#0062e3");
    expect(resolve("accent", "dark", "mono")).toBe("#fefefe");
    expect(resolve("destructive", "light", "mono")).toBe(resolve("destructive", "light"));
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
