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

import { cn } from "@/lib/utils";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { TextField } from "./TextField";

const RESEND_COOLDOWN_MS = resendCooldownMsFrom(
  process.env.NEXT_PUBLIC_OTP_RESEND_COOLDOWN_SECONDS,
);

export function AuthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithEmail, verifyEmailCode } = useAuth();
  const [state, dispatch] = useReducer(otpReducer, INITIAL_OTP_STATE);

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
      // Close straight away so the display-name sheet never stacks on this one.
      onClose();
    } catch (error) {
      dispatch({ type: "verify-failed", message: messageFor(error) });
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} label="Home is just a login away">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void (onCodeStep ? verify() : send());
        }}
      >
        <h2 className={cn("text-2xl font-medium", onCodeStep ? "font-sans" : "font-display")}>
          {onCodeStep ? "Just a little verification" : "Home is just a login away"}
        </h2>
        <p className="mt-2 text-[calc(14px*var(--font-scale,1))] leading-[normal] text-muted-foreground">
          {onCodeStep
            ? `Your code has landed at ${state.email}`
            : `Your email, and we'll take it from here`}
        </p>

        {onCodeStep ? (
          <TextField
            kind="code"
            value={state.code}
            onChange={(value) => dispatch({ type: "edit-code", value })}
            disabled={busy}
            errorId={state.error ? "auth-sheet-error" : undefined}
            className="mt-6 font-bold"
          />
        ) : (
          <TextField
            kind="email"
            value={state.email}
            onChange={(value) => dispatch({ type: "edit-email", value })}
            disabled={busy}
            errorId={state.error ? "auth-sheet-error" : undefined}
            className="mt-6"
          />
        )}

        {state.error ? (
          <p
            id="auth-sheet-error"
            role="alert"
            className={cn("mt-3 text-sm text-destructive", !onCodeStep && "px-1")}
          >
            {state.error}
          </p>
        ) : null}

        <Button
          type="submit"
          label={onCodeStep ? (busy ? "Checking…" : "Continue") : "Send code"}
          loading={busy}
          className={cn("mt-5", onCodeStep && "rounded-3xl font-sans font-semibold")}
        />

        {onCodeStep ? (
          <div className="mt-4 flex items-center justify-between px-1 text-sm">
            <button
              type="button"
              onClick={() => dispatch({ type: "back-to-email" })}
              className="text-foreground hover:cursor-pointer"
            >
              <span className="block border-b border-muted-foreground">Use a different email</span>
            </button>

            <button
              type="button"
              onClick={() => void send()}
              disabled={!canResend(state, now) || busy}
              className="text-foreground hover:cursor-pointer disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              <span className="block border-b border-foreground in-disabled:border-muted-foreground in-disabled:opacity-50">
                {canResend(state, now)
                  ? "Resend code"
                  : `Resend in ${resendSecondsRemaining(state, now)}s`}
              </span>
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
