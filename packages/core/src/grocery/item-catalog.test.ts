import { describe, expect, it } from "vitest";

import {
  canonicalCatalogName,
  catalogEntries,
  categoryFallbackDefaults,
  matchCatalogItem,
} from "./item-catalog";
import { bestKeywordMatch, prepareKeywords } from "./keyword-match";

describe("matchCatalogItem", () => {
  it("matches a name, an alias and a plural", () => {
    expect(matchCatalogItem("Milk")).toEqual({
      category: "Dairy",
      defaults: { quantity: 1, unit: "L" },
    });
    expect(matchCatalogItem("doodh")?.category).toBe("Dairy");
    expect(matchCatalogItem("Bananas")?.category).toBe("Fruits");
  });

  it("prefers the trailing head noun and the longer phrase", () => {
    expect(matchCatalogItem("oat milk")?.defaults).toEqual({ quantity: 1, unit: "L" });
    expect(matchCatalogItem("spring onion")?.defaults).toEqual({ quantity: 1, unit: "bn" });
  });

  it("returns the same answer for repeated calls", () => {
    expect(matchCatalogItem("onion")).toBe(matchCatalogItem("onion"));
    expect(matchCatalogItem("zzzz")).toBeNull();
  });
});

describe("catalog lookups", () => {
  it("resolves aliases to the catalog name", () => {
    expect(canonicalCatalogName("pyaz")).toBe("onion");
    expect(canonicalCatalogName("unlisted")).toBe("unlisted");
  });

  it("lists every catalog entry once", () => {
    const names = catalogEntries().map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("milk");
  });

  it("falls back to the category default regardless of case", () => {
    expect(categoryFallbackDefaults("dairy")).toEqual({ quantity: 500, unit: "g" });
    expect(categoryFallbackDefaults(null)).toBeNull();
  });
});

describe("bestKeywordMatch", () => {
  it("never matches a fragment of a longer word", () => {
    expect(bestKeywordMatch("watermelon", ["water", "melon"])).toBeNull();
  });

  it("gives the same answer for raw and prepared keywords", () => {
    const keywords = ["milk", "milk chocolate", "chocolate"];
    for (const name of ["Milk chocolate bar", "dark chocolate", "toned milk"]) {
      expect(bestKeywordMatch(name, prepareKeywords(keywords))).toBe(
        bestKeywordMatch(name, keywords),
      );
    }
  });
});
