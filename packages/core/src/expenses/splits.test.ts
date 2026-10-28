import { describe, expect, it } from "vitest";

import { allocatePaise, computeSplit, formatHundredths, rescaleAmounts } from "./splits";

const ids = ["a", "b", "c"];

describe("rescaleAmounts", () => {
  it("moves a sole payer to the new total", () => {
    expect(rescaleAmounts(["a"], { a: "500" }, 80000)).toEqual({ a: "800" });
  });

  it("keeps several payers in proportion and adds up exactly", () => {
    expect(rescaleAmounts(["a", "b"], { a: "300", b: "100" }, 100000)).toEqual({
      a: "750",
      b: "250",
    });
    expect(rescaleAmounts(["a", "b", "c"], { a: "1", b: "1", c: "1" }, 100)).toEqual({
      a: "0.34",
      b: "0.33",
      c: "0.33",
    });
  });

  it("splits evenly when no amount is set", () => {
    expect(rescaleAmounts(["a", "b"], { a: "", b: "0" }, 1000)).toEqual({ a: "5", b: "5" });
  });
});

describe("allocatePaise", () => {
  it("always adds up to the total", () => {
    expect(allocatePaise(10000, [1, 1, 1])).toEqual([3334, 3333, 3333]);
    expect(allocatePaise(100, [1, 2])).toEqual([33, 67]);
  });

  it("gives nothing when no weight is set", () => {
    expect(allocatePaise(500, [0, 0])).toEqual([0, 0]);
  });
});

describe("formatHundredths", () => {
  it("drops trailing zeros", () => {
    expect(formatHundredths(10000)).toBe("100");
    expect(formatHundredths(3350)).toBe("33.5");
    expect(formatHundredths(3333)).toBe("33.33");
  });
});

describe("computeSplit", () => {
  it("splits equally between the included people", () => {
    const result = computeSplit(10000, ids, { method: "equal", included: ["a", "c"] });
    expect(result.valid).toBe(true);
    expect(result.sharesPaise).toEqual({ a: 5000, c: 5000 });
    expect(result.summary).toEqual({
      primary: "₹50/person",
      secondary: "(2 people)",
      error: false,
    });
  });

  it("needs at least one person for an equal split", () => {
    const result = computeSplit(10000, ids, { method: "equal", included: [] });
    expect(result.valid).toBe(false);
    expect(result.summary.error).toBe(true);
  });

  it("balances exact amounts against the total", () => {
    const short = computeSplit(10000, ids, { method: "exact", values: { a: "40" } });
    expect(short.valid).toBe(false);
    expect(short.summary.secondary).toBe("₹60 left");

    const balanced = computeSplit(10000, ids, { method: "exact", values: { a: "40", b: "60" } });
    expect(balanced.valid).toBe(true);
    expect(balanced.sharesPaise).toEqual({ a: 4000, b: 6000, c: 0 });
  });

  it("needs percentages to reach 100", () => {
    const over = computeSplit(10000, ids, { method: "percent", values: { a: "60", b: "50" } });
    expect(over.valid).toBe(false);
    expect(over.summary).toMatchObject({ secondary: "10% over", error: true });
    expect(over.sharesPaise).toEqual({ a: 6000, b: 5000, c: 0 });

    const partial = computeSplit(50000, ["a", "b"], { method: "percent", values: { a: "25" } });
    expect(partial.valid).toBe(false);
    expect(partial.sharesPaise).toEqual({ a: 12500, b: 0 });

    const full = computeSplit(1000, ids, {
      method: "percent",
      values: { a: "33.33", b: "33.33", c: "33.34" },
    });
    expect(full.valid).toBe(true);
    expect(Object.values(full.sharesPaise).reduce((sum, part) => sum + part, 0)).toBe(1000);
  });

  it("splits by shares", () => {
    const result = computeSplit(9000, ids, { method: "shares", values: { a: "2", b: "1" } });
    expect(result.valid).toBe(true);
    expect(result.sharesPaise).toEqual({ a: 6000, b: 3000, c: 0 });
    expect(result.summary.primary).toBe("3 total shares");
  });
});
