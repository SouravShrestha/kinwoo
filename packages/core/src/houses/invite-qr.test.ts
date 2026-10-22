import { describe, expect, it } from "vitest";

import { qrPathData } from "./invite-qr";

describe("qrPathData", () => {
  it("returns an empty path for an empty or blank grid", () => {
    expect(qrPathData([])).toBe("");
    expect(qrPathData([[false, false]])).toBe("");
  });

  it("merges adjacent dark modules in a row into one rectangle", () => {
    expect(qrPathData([[true, true, false, true]])).toBe("M0 0h2v1h-2zM3 0h1v1h-1z");
  });

  it("offsets each row by its index", () => {
    expect(qrPathData([[false], [true]])).toBe("M0 1h1v1h-1z");
  });
});
