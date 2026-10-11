import { describe, expect, it } from "vitest";

import {
  INVITE_CODE_PATTERN,
  inviteAppUrl,
  inviteWebUrl,
  normaliseInviteCode,
  parseInviteInput,
} from "./invite-code";

describe("normaliseInviteCode", () => {
  it("uppercases and strips spaces and dashes", () => {
    expect(normaliseInviteCode(" ab2-cd 3 ")).toBe("AB2CD3");
  });
});

describe("INVITE_CODE_PATTERN", () => {
  it("accepts codes from the allowed alphabet", () => {
    expect(INVITE_CODE_PATTERN.test("ABCDEF")).toBe(true);
    expect(INVITE_CODE_PATTERN.test("XYZ789")).toBe(true);
    expect(INVITE_CODE_PATTERN.test("SEED22")).toBe(true);
  });

  it("rejects the ambiguous characters", () => {
    for (const bad of ["0", "O", "1", "I", "L"]) {
      expect(INVITE_CODE_PATTERN.test(`ABCDE${bad}`)).toBe(false);
    }
  });

  it("rejects the wrong length", () => {
    expect(INVITE_CODE_PATTERN.test("ABCDE")).toBe(false);
    expect(INVITE_CODE_PATTERN.test("ABCDEFG")).toBe(false);
  });
});

describe("parseInviteInput", () => {
  it("accepts a typed code in any case", () => {
    expect(parseInviteInput("abc 234")).toEqual({ ok: true, code: "ABC234" });
  });

  it("extracts the code from a web link", () => {
    expect(parseInviteInput("https://kinwoo.cbsdev.me/join/abc234?utm=x")).toEqual({
      ok: true,
      code: "ABC234",
    });
  });

  it("extracts the code from an app link", () => {
    expect(parseInviteInput("kinwoo://join/ABC234")).toEqual({ ok: true, code: "ABC234" });
  });

  it("reports empty and invalid input", () => {
    expect(parseInviteInput("   ")).toEqual({ ok: false, error: "empty" });
    expect(parseInviteInput("hello")).toEqual({ ok: false, error: "invalid" });
    expect(parseInviteInput("ABCDE0")).toEqual({ ok: false, error: "invalid" });
  });

  it("survives a malformed percent escape", () => {
    expect(parseInviteInput("https://x.test/join/%E0%A4%A")).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});

describe("invite links", () => {
  it("builds web and app urls", () => {
    expect(inviteWebUrl("https://kinwoo.cbsdev.me/", "ABC234")).toBe(
      "https://kinwoo.cbsdev.me/join/ABC234",
    );
    expect(inviteAppUrl("ABC234")).toBe("kinwoo://join/ABC234");
  });
});
