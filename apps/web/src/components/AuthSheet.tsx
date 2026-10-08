"use client";

import {
  CODE_LENGTH,
  INITIAL_OTP_STATE,
  canResend,
  isValidEmail,
  normaliseEmail,
  otpReducer,
  resendCooldownMsFrom,
  resendSecondsRemaining,
  useAuth,
} from "@kinwoo/client/auth";
import { useEffect, useReducer, useState } from "react";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { TextField } from "./TextField";

const RESEND_COOLDOWN_MS = resendCooldownMsFrom(
  process.env.NEXT_PUBLIC_OTP_RESEND_COOLDOWN_SECONDS,
);

export function AuthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithEmail, verifyEmailCode } = useAuth();
  const [state, dispatch] = useReducer(otpReducer, INITIAL_OTP_STATE);

  // Only ticks while a code is outstanding, to drive the resend countdown.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open || state.phase !== "code") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open, state.phase]);

  useEffect(() => {
    if (!open) dispatch({ type: "reset" });
  }, [open]);

  const busy = state.phase === "sending" || state.phase === "verifying";
  const onCodeStep = state.phase === "code" || state.phase === "verifying";

  const send = async () => {
    dispatch({ type: "submit-email", now: Date.now() });
    if (!isValidEmail(state.email)) return;

    try {
      await signInWithEmail(normaliseEmail(state.email));
      dispatch({ type: "send-succeeded", now: Date.now(), cooldownMs: RESEND_COOLDOWN_MS });
    } catch (error) {
      dispatch({ type: "send-failed", message: messageFor(error) });
    }
  };

  const verify = async () => {
    dispatch({ type: "submit-code" });
    if (state.code.length !== CODE_LENGTH) return;

    try {
      await verifyEmailCode(state.email, state.code);
      // Not closed here: signing in flips the auth state and the caller
      // unmounts this sheet.
    } catch (error) {
      dispatch({ type: "verify-failed", message: messageFor(error) });
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} label="Log in with email">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void (onCodeStep ? verify() : send());
        }}
      >
        <h2 className="font-display text-xl font-medium">
          {onCodeStep ? "Enter your code" : "Log in with email"}
        </h2>
        <p className="mt-2 text-muted-foreground text-sm">
          {onCodeStep
            ? `We sent a ${CODE_LENGTH}-digit code to ${state.email}.`
            : `We'll send you a ${CODE_LENGTH}-digit code. No password needed.`}
        </p>

        {onCodeStep ? (
          <TextField
            kind="code"
            value={state.code}
            onChange={(value) => dispatch({ type: "edit-code", value })}
            disabled={busy}
            errorId={state.error ? "auth-sheet-error" : undefined}
            className="mt-8"
          />
        ) : (
          <TextField
            kind="email"
            value={state.email}
            onChange={(value) => dispatch({ type: "edit-email", value })}
            disabled={busy}
            errorId={state.error ? "auth-sheet-error" : undefined}
            className="mt-8"
          />
        )}

        {state.error ? (
          <p id="auth-sheet-error" role="alert" className="mt-3 text-sm text-destructive px-2">
            {state.error}
          </p>
        ) : null}

        <Button
          type="submit"
          label={
            busy ? (onCodeStep ? "Checking…" : "Sending…") : onCodeStep ? "Continue" : "Send code"
          }
          loading={busy}
          className="mt-6"
        />

        {onCodeStep ? (
          <div className="mt-5 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => dispatch({ type: "back-to-email" })}
              className="text-muted-foreground underline"
            >
              Use a different email
            </button>

            <button
              type="button"
              onClick={() => void send()}
              disabled={!canResend(state, now) || busy}
              className="underline disabled:opacity-50"
            >
              {canResend(state, now)
                ? "Resend code"
                : `Resend in ${resendSecondsRemaining(state, now)}s`}
            </button>
          </div>
        ) : null}
      </form>
    </BottomSheet>
  );
}

function messageFor(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Try again.";

  // Supabase's rate-limit copy quotes an interval that is not ours to promise.
  if (/rate limit/i.test(error.message)) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (/expired|invalid/i.test(error.message)) {
    return "That code has expired or was already used.";
  }

  return error.message;
}
