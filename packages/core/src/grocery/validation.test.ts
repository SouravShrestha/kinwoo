import { describe, expect, it } from "vitest";

import {
  BATCH_NAME_MAX_LENGTH,
  isPaiseAmount,
  MAX_AMOUNT_PAISE,
  parseRupeesToPaise,
  validateBatchName,
} from "./validation";

describe("parseRupeesToPaise", () => {
  it("treats blank input as no amount", () => {
    expect(parseRupeesToPaise("")).toEqual({ ok: true, value: null });
    expect(parseRupeesToPaise("   ")).toEqual({ ok: true, value: null });
  });

  it("converts rupees to paise without floating point drift", () => {
    expect(parseRupeesToPaise("450")).toEqual({ ok: true, value: 45000 });
    expect(parseRupeesToPaise("12.5")).toEqual({ ok: true, value: 1250 });
    expect(parseRupeesToPaise("0.29")).toEqual({ ok: true, value: 29 });
    expect(parseRupeesToPaise("1,250.75")).toEqual({ ok: true, value: 125075 });
  });

  it("rejects negatives, letters and extra decimals", () => {
    expect(parseRupeesToPaise("-5")).toEqual({ ok: false, error: "invalid" });
    expect(parseRupeesToPaise("abc")).toEqual({ ok: false, error: "invalid" });
    expect(parseRupeesToPaise("1.234")).toEqual({ ok: false, error: "invalid" });
    expect(parseRupeesToPaise(".5")).toEqual({ ok: false, error: "invalid" });
  });

  it("rejects amounts above the cap", () => {
    expect(parseRupeesToPaise(String(MAX_AMOUNT_PAISE / 100 + 1))).toEqual({
      ok: false,
      error: "too-large",
    });
  });
});

describe("isPaiseAmount", () => {
  it("accepts non-negative integers within the cap", () => {
    expect(isPaiseAmount(0)).toBe(true);
    expect(isPaiseAmount(45000)).toBe(true);
    expect(isPaiseAmount(-1)).toBe(false);
    expect(isPaiseAmount(1.5)).toBe(false);
    expect(isPaiseAmount("100")).toBe(false);
    expect(isPaiseAmount(MAX_AMOUNT_PAISE + 1)).toBe(false);
  });
});

describe("validateBatchName", () => {
  it("returns null for blank names", () => {
    expect(validateBatchName("")).toEqual({ ok: true, value: null });
    expect(validateBatchName(null)).toEqual({ ok: true, value: null });
    expect(validateBatchName("   ")).toEqual({ ok: true, value: null });
  });

  it("collapses whitespace", () => {
    expect(validateBatchName("  Weekly   veg ")).toEqual({ ok: true, value: "Weekly veg" });
  });

  it("enforces the maximum length", () => {
    expect(validateBatchName("a".repeat(BATCH_NAME_MAX_LENGTH)).ok).toBe(true);
    expect(validateBatchName("a".repeat(BATCH_NAME_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: "too-long",
    });
  });

  it("rejects control characters", () => {
    expect(validateBatchName("Veg\u0007")).toEqual({ ok: false, error: "invalid-characters" });
  });
});
