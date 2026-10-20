import { describe, expect, it } from "vitest";

import { DISPLAY_NAME_MAX_LENGTH, normaliseDisplayName, validateDisplayName } from "./display-name";

describe("normaliseDisplayName", () => {
  it("trims and collapses whitespace", () => {
    expect(normaliseDisplayName("  Daisy  ")).toBe("Daisy");
    expect(normaliseDisplayName("Daisy   May")).toBe("Daisy May");
    expect(normaliseDisplayName("Daisy\t\nMay")).toBe("Daisy May");
  });
});

describe("validateDisplayName", () => {
  it("accepts an ordinary name", () => {
    expect(validateDisplayName("Daisy")).toEqual({ ok: true, value: "Daisy" });
  });

  it("returns the normalised value, not the raw input", () => {
    expect(validateDisplayName("  Daisy   May ")).toEqual({ ok: true, value: "Daisy May" });
  });

  it("accepts non-latin names and emoji", () => {
    expect(validateDisplayName("सौरव").ok).toBe(true);
    expect(validateDisplayName("Daisy 🌼").ok).toBe(true);
  });

  it("rejects empty and whitespace-only input", () => {
    expect(validateDisplayName("")).toEqual({ ok: false, error: "empty" });
    expect(validateDisplayName("   ")).toEqual({ ok: false, error: "empty" });
  });

  it("accepts exactly the maximum length and rejects one more", () => {
    expect(validateDisplayName("a".repeat(DISPLAY_NAME_MAX_LENGTH)).ok).toBe(true);
    expect(validateDisplayName("a".repeat(DISPLAY_NAME_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: "too-long",
    });
  });

  it("rejects control characters", () => {
    expect(validateDisplayName("Dai\u0000sy")).toEqual({
      ok: false,
      error: "invalid-characters",
    });
  });

  it("rejects bidi overrides that can disguise a name", () => {
    expect(validateDisplayName("Eve\u202elin")).toEqual({
      ok: false,
      error: "invalid-characters",
    });
  });
});
