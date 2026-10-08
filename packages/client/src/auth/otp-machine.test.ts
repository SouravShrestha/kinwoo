import { describe, expect, it } from "vitest";

import {
  CODE_LENGTH,
  INITIAL_OTP_STATE,
  RESEND_COOLDOWN_MS,
  canResend,
  isCompleteCode,
  isValidEmail,
  normaliseCode,
  normaliseEmail,
  otpReducer,
  resendCooldownMsFrom,
  resendSecondsRemaining,
  type OtpAction,
  type OtpState,
} from "./otp-machine";

const run = (state: OtpState, ...actions: OtpAction[]) => actions.reduce(otpReducer, state);

const NOW = 1_000_000;

describe("normalisers", () => {
  it("trims and lowercases an email", () => {
    expect(normaliseEmail("  Daisy@Example.COM ")).toBe("daisy@example.com");
  });

  it("keeps only digits in a code and caps the length", () => {
    expect(normaliseCode("12-34 56")).toBe("123456");
    expect(normaliseCode("abc123")).toBe("123");
    expect(normaliseCode("1234567890")).toBe("123456");
  });

  it("accepts ordinary addresses and rejects obvious nonsense", () => {
    expect(isValidEmail("daisy@example.com")).toBe(true);
    expect(isValidEmail(" DAISY@example.co.uk ")).toBe(true);
    expect(isValidEmail("daisy+tag@example.com")).toBe(true);
    expect(isValidEmail("daisy")).toBe(false);
    expect(isValidEmail("daisy@")).toBe(false);
    expect(isValidEmail("daisy@example")).toBe(false);
    expect(isValidEmail("a b@example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("knows when a code is complete", () => {
    expect(isCompleteCode("123456")).toBe(true);
    expect(isCompleteCode("12345")).toBe(false);
  });
});

describe("the happy path", () => {
  it("walks email to verified", () => {
    let state = run(
      INITIAL_OTP_STATE,
      { type: "edit-email", value: "daisy@example.com" },
      { type: "submit-email", now: NOW },
    );
    expect(state.phase).toBe("sending");

    state = otpReducer(state, { type: "send-succeeded", now: NOW });
    expect(state.phase).toBe("code");
    expect(state.error).toBeNull();

    state = run(state, { type: "edit-code", value: "123456" }, { type: "submit-code" });
    expect(state.phase).toBe("verifying");
  });

  it("normalises the email when the code is sent", () => {
    const state = run(
      INITIAL_OTP_STATE,
      { type: "edit-email", value: "  Daisy@Example.com " },
      { type: "submit-email", now: NOW },
      { type: "send-succeeded", now: NOW },
    );

    expect(state.email).toBe("daisy@example.com");
  });
});

describe("validation", () => {
  it("refuses to leave the email step with an invalid address", () => {
    const state = run(
      INITIAL_OTP_STATE,
      { type: "edit-email", value: "nope" },
      { type: "submit-email", now: NOW },
    );

    expect(state.phase).toBe("email");
    expect(state.error).toBe("Enter a valid email address.");
  });

  it("refuses to verify an incomplete code", () => {
    const state = run(
      INITIAL_OTP_STATE,
      { type: "edit-email", value: "daisy@example.com" },
      { type: "submit-email", now: NOW },
      { type: "send-succeeded", now: NOW },
      { type: "edit-code", value: "123" },
      { type: "submit-code" },
    );

    expect(state.phase).toBe("code");
    expect(state.error).toBe(`Enter the ${CODE_LENGTH}-digit code.`);
  });

  it("clears the error as soon as the user edits the field", () => {
    const withError = run(
      INITIAL_OTP_STATE,
      { type: "edit-email", value: "nope" },
      { type: "submit-email", now: NOW },
    );
    expect(withError.error).not.toBeNull();

    expect(otpReducer(withError, { type: "edit-email", value: "n" }).error).toBeNull();
  });
});

describe("failures", () => {
  it("returns to the email step when sending fails", () => {
    const state = run(
      INITIAL_OTP_STATE,
      { type: "edit-email", value: "daisy@example.com" },
      { type: "submit-email", now: NOW },
      { type: "send-failed", message: "Email rate limit exceeded" },
    );

    expect(state.phase).toBe("email");
    expect(state.error).toBe("Email rate limit exceeded");
    expect(state.email).toBe("daisy@example.com");
  });

  it("stays on the code step and clears the digits when verification fails", () => {
    const state = run(
      INITIAL_OTP_STATE,
      { type: "edit-email", value: "daisy@example.com" },
      { type: "submit-email", now: NOW },
      { type: "send-succeeded", now: NOW },
      { type: "edit-code", value: "000000" },
      { type: "submit-code" },
      { type: "verify-failed", message: "That code is not valid." },
    );

    expect(state.phase).toBe("code");
    expect(state.code).toBe("");
    expect(state.error).toBe("That code is not valid.");
  });
});

describe("going back", () => {
  it("keeps the email but drops the code and the cooldown", () => {
    const state = run(
      INITIAL_OTP_STATE,
      { type: "edit-email", value: "daisy@example.com" },
      { type: "submit-email", now: NOW },
      { type: "send-succeeded", now: NOW },
      { type: "edit-code", value: "123456" },
      { type: "back-to-email" },
    );

    expect(state).toEqual({ ...INITIAL_OTP_STATE, email: "daisy@example.com" });
  });

  it("resets everything on reset", () => {
    const state = run(
      INITIAL_OTP_STATE,
      { type: "edit-email", value: "daisy@example.com" },
      { type: "reset" },
    );

    expect(state).toEqual(INITIAL_OTP_STATE);
  });
});

describe("resend cooldown", () => {
  const sent = run(
    INITIAL_OTP_STATE,
    { type: "edit-email", value: "daisy@example.com" },
    { type: "submit-email", now: NOW },
    { type: "send-succeeded", now: NOW },
  );

  it("blocks a resend immediately after sending", () => {
    expect(canResend(sent, NOW)).toBe(false);
    expect(resendSecondsRemaining(sent, NOW)).toBe(RESEND_COOLDOWN_MS / 1000);
  });

  it("allows a resend once the cooldown elapses", () => {
    expect(canResend(sent, NOW + RESEND_COOLDOWN_MS)).toBe(true);
    expect(resendSecondsRemaining(sent, NOW + RESEND_COOLDOWN_MS)).toBe(0);
  });

  it("counts down", () => {
    expect(resendSecondsRemaining(sent, NOW + 10_000)).toBe(20);
  });

  it("never offers a resend outside the code step", () => {
    expect(canResend(INITIAL_OTP_STATE, NOW)).toBe(false);
  });

  it("restarts the cooldown after a successful resend", () => {
    const later = NOW + RESEND_COOLDOWN_MS;
    const resent = otpReducer(sent, { type: "send-succeeded", now: later });

    expect(canResend(resent, later)).toBe(false);
    expect(resent.resendAvailableAt).toBe(later + RESEND_COOLDOWN_MS);
  });

  it("uses a cooldown passed with the action", () => {
    const instant = otpReducer(sent, { type: "send-succeeded", now: NOW, cooldownMs: 0 });

    expect(canResend(instant, NOW)).toBe(true);
  });
});

describe("resendCooldownMsFrom", () => {
  it("reads whole seconds", () => {
    expect(resendCooldownMsFrom("0")).toBe(0);
    expect(resendCooldownMsFrom(" 5 ")).toBe(5_000);
  });

  it("falls back to the default when unset or malformed", () => {
    for (const value of [undefined, "", "abc", "-1", "1.5"]) {
      expect(resendCooldownMsFrom(value)).toBe(RESEND_COOLDOWN_MS);
    }
  });
});
