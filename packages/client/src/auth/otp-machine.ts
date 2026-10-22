export const CODE_LENGTH = 6;
export const RESEND_COOLDOWN_MS = 30_000;

// Deliberately permissive: a stricter pattern only rejects addresses that work.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type OtpPhase = "email" | "sending" | "code" | "verifying";

export interface OtpState {
  phase: OtpPhase;
  email: string;
  code: string;
  error: string | null;
  resendAvailableAt: number | null;
}

export const INITIAL_OTP_STATE: OtpState = {
  phase: "email",
  email: "",
  code: "",
  error: null,
  resendAvailableAt: null,
};

export type OtpAction =
  | { type: "edit-email"; value: string }
  | { type: "edit-code"; value: string }
  | { type: "submit-email"; now: number }
  | { type: "send-succeeded"; now: number; cooldownMs?: number }
  | { type: "send-failed"; message: string }
  | { type: "submit-code" }
  | { type: "verify-failed"; message: string }
  | { type: "back-to-email" }
  | { type: "reset" };

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normaliseCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(normaliseEmail(value));
}

export function isCompleteCode(value: string): boolean {
  return normaliseCode(value).length === CODE_LENGTH;
}

// Malformed values fall back to the default so a typo cannot remove the cooldown.
export function resendCooldownMsFrom(seconds: string | undefined): number {
  if (seconds === undefined || !/^\d+$/.test(seconds.trim())) return RESEND_COOLDOWN_MS;
  return Number(seconds.trim()) * 1000;
}

export function canResend(state: OtpState, now: number): boolean {
  if (state.phase !== "code") return false;
  return state.resendAvailableAt === null || now >= state.resendAvailableAt;
}

export function resendSecondsRemaining(state: OtpState, now: number): number {
  if (state.resendAvailableAt === null) return 0;
  return Math.max(0, Math.ceil((state.resendAvailableAt - now) / 1000));
}

export function otpReducer(state: OtpState, action: OtpAction): OtpState {
  switch (action.type) {
    case "edit-email":
      return { ...state, email: action.value, error: null };

    case "edit-code":
      return { ...state, code: normaliseCode(action.value), error: null };

    case "submit-email": {
      if (!isValidEmail(state.email)) {
        return { ...state, error: "Enter a valid email address." };
      }
      return { ...state, phase: "sending", error: null };
    }

    case "send-succeeded":
      return {
        ...state,
        phase: "code",
        email: normaliseEmail(state.email),
        code: "",
        error: null,
        resendAvailableAt: action.now + (action.cooldownMs ?? RESEND_COOLDOWN_MS),
      };

    case "send-failed":
      return { ...state, phase: "email", error: action.message };

    case "submit-code": {
      if (!isCompleteCode(state.code)) {
        return { ...state, error: `Enter the ${CODE_LENGTH}-digit code.` };
      }
      return { ...state, phase: "verifying", error: null };
    }

    case "verify-failed":
      return { ...state, phase: "code", code: "", error: action.message };

    case "back-to-email":
      return { ...INITIAL_OTP_STATE, email: state.email };

    case "reset":
      return INITIAL_OTP_STATE;
  }
}
