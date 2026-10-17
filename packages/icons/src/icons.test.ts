import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import * as geometry from "./data";

// Reads source instead of importing: native.tsx pulls in react-native-svg, which
// cannot load in node.

const here = path.dirname(new URL(import.meta.url).pathname);
const read = (file: string) => readFileSync(path.join(here, file), "utf8");

function exportedComponents(source: string): string[] {
  return [...source.matchAll(/export const (\w+) =/g)].map((match) => match[1]).sort();
}

function referencedGeometry(source: string): string[] {
  return [...new Set([...source.matchAll(/geometry\.(\w+)/g)].map((match) => match[1]))].sort();
}

const webSource = read("index.tsx");
const nativeSource = read("native.tsx");

describe("icon entry points", () => {
  it("export the same component names on both platforms", () => {
    expect(exportedComponents(webSource)).toEqual(exportedComponents(nativeSource));
  });

  it("export one component per geometry", () => {
    expect(exportedComponents(webSource)).toHaveLength(Object.keys(geometry).length);
  });

  it("render every geometry on both platforms", () => {
    const names = Object.keys(geometry).sort();
    expect(referencedGeometry(webSource)).toEqual(names);
    expect(referencedGeometry(nativeSource)).toEqual(names);
  });
});

describe("icon geometry", () => {
  const entries = Object.entries(geometry);

  it("gives every icon a viewBox and at least one path", () => {
    for (const [name, icon] of entries) {
      expect(icon.viewBox, name).toMatch(/^(-?\d+(\.\d+)? ){3}\d+(\.\d+)?$/);
      expect(icon.paths.length, name).toBeGreaterThan(0);
    }
  });

  it("gives every path non-empty data", () => {
    for (const [name, icon] of entries) {
      for (const [index, p] of icon.paths.entries()) {
        expect(p.d.length, `${name}[${index}]`).toBeGreaterThan(0);
      }
    }
  });

  it("only hardcodes fills on the brand marks", () => {
    for (const [name, icon] of entries) {
      const hasFixedFill = icon.paths.some((p) => p.fill !== undefined);
      const isBrandMark = ["googleIcon"].includes(name);
      expect(hasFixedFill, name).toBe(isBrandMark);
    }
  });
});
