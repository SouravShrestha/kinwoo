import { describe, expect, it } from "vitest";

import {
  HOUSE_ADDRESS_MAX_LENGTH,
  HOUSE_NAME_MAX_LENGTH,
  validateHouseAddress,
  INVITE_EMAIL_MAX_LENGTH,
  isHouseJoinMode,
  validateHouseName,
  validateInviteEmail,
} from "./validation";

describe("validateHouseName", () => {
  it("trims and collapses whitespace", () => {
    expect(validateHouseName("  Sourav   G4 ")).toEqual({ ok: true, value: "Sourav G4" });
  });

  it("rejects empty and whitespace-only names", () => {
    expect(validateHouseName("")).toEqual({ ok: false, error: "empty" });
    expect(validateHouseName("   ")).toEqual({ ok: false, error: "empty" });
  });

  it("accepts the maximum length and rejects one more", () => {
    expect(validateHouseName("a".repeat(HOUSE_NAME_MAX_LENGTH)).ok).toBe(true);
    expect(validateHouseName("a".repeat(HOUSE_NAME_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: "too-long",
    });
  });

  it("counts an emoji as one character", () => {
    expect(validateHouseName("🏠".repeat(HOUSE_NAME_MAX_LENGTH)).ok).toBe(true);
  });

  it("rejects control characters", () => {
    expect(validateHouseName("Fla\u0000t")).toEqual({ ok: false, error: "invalid-characters" });
  });
});

describe("validateHouseAddress", () => {
  it("treats blank input as no address", () => {
    expect(validateHouseAddress(null)).toEqual({ ok: true, value: null });
  });

  it("enforces the maximum length", () => {
    expect(validateHouseAddress("a".repeat(HOUSE_ADDRESS_MAX_LENGTH)).ok).toBe(true);
    expect(validateHouseAddress("a".repeat(HOUSE_ADDRESS_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: "too-long",
    });
  });
});

describe("validateInviteEmail", () => {
  it("trims and lowercases", () => {
    expect(validateInviteEmail("  Asha@Example.COM ")).toEqual({
      ok: true,
      value: "asha@example.com",
    });
  });

  it("rejects empty and malformed addresses", () => {
    expect(validateInviteEmail("  ")).toEqual({ ok: false, error: "empty" });
    for (const bad of ["asha", "asha@", "@example.com", "asha@example", "a b@example.com"]) {
      expect(validateInviteEmail(bad)).toEqual({ ok: false, error: "invalid" });
    }
  });

  it("enforces the maximum length", () => {
    const local = "a".repeat(INVITE_EMAIL_MAX_LENGTH);
    expect(validateInviteEmail(`${local}@example.com`)).toEqual({ ok: false, error: "invalid" });
  });
});

describe("isHouseJoinMode", () => {
  it("accepts only the known modes", () => {
    expect(isHouseJoinMode("anyone")).toBe(true);
    expect(isHouseJoinMode("invited")).toBe(true);
    expect(isHouseJoinMode("everyone")).toBe(false);
    expect(isHouseJoinMode(undefined)).toBe(false);
  });
});
