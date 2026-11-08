"use client";

import {
  CODE_LENGTH,
  INITIAL_OTP_STATE,
  OTP_SUCCESS_HOLD_MS,
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
import { OneTimeCode } from "./ui/one-time-code";

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

  // iOS Safari only lets a script open the keyboard (after the network await) by moving focus from
  // an input that has it. Unmounting the email field first drops the keyboard, so it stays mounted,
  // hidden, until the code field has taken focus.
  const [codeFocused, setCodeFocused] = useState(false);
  if (!onCodeStep && codeFocused) setCodeFocused(false);

  const [verified, setVerified] = useState(false);
  if (!open && verified) setVerified(false);
  const showEmail = !onCodeStep || !codeFocused;
  // From the moment a code is checked until the sheet closes, the code step's links do nothing.
  const locked = busy || verified;
  const resendable = canResend(state, now) && !locked;

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

  // Takes the code directly: onComplete fires before the edit-code dispatch reaches `state`.
  const verify = async (code = state.code) => {
    dispatch({ type: "submit-code" });
    if (code.length !== CODE_LENGTH) return;

    try {
      await verifyEmailCode(state.email, code);
      // Let the success pill play before closing. AuthGate waits this long too, so the
      // display-name sheet never stacks on this one.
      setVerified(true);
      setTimeout(onClose, OTP_SUCCESS_HOLD_MS);
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
          // Spacing on a wrapper: the field sizes itself from its container, so keep its box clean.
          <div className="py-10" onFocus={() => setCodeFocused(true)}>
            <OneTimeCode
              autoFocus
              length={CODE_LENGTH}
              value={state.code}
              status={
                verified
                  ? "success"
                  : state.phase === "verifying"
                    ? "verifying"
                    : state.error
                      ? "error"
                      : "idle"
              }
              errorMessage={state.error}
              onChange={(value) => dispatch({ type: "edit-code", value })}
              onComplete={(code) => void verify(code)}
            />
          </div>
        ) : null}
        {showEmail ? (
          <TextField
            kind="email"
            autoFocus
            value={state.email}
            // Not disabled while sending: a disabled input loses focus, and mobile browsers then
            // refuse to move focus (and the keyboard) to the code field once it arrives.
            onChange={(value) => busy || dispatch({ type: "edit-email", value })}
            errorId={state.error ? "auth-sheet-error" : undefined}
            className={onCodeStep ? "sr-only" : "mt-6"}
          />
        ) : null}

        {state.error && !onCodeStep ? (
          <p id="auth-sheet-error" role="alert" className="mt-3 px-1 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        {/* No submit button on the code step: the last digit submits. Enter still works. */}
        {onCodeStep ? null : (
          <Button
            type="submit"
            label="Send code"
            loading={busy}
            className="mt-5"
            // Keeps focus (and the iOS keyboard) on the email field through the tap, so focus can
            // move straight to the code field. iOS only opens a keyboard for a script while one is up.
            onPointerDown={(event) => event.preventDefault()}
          />
        )}

        {onCodeStep ? (
          <div className="flex items-center justify-between px-1 text-sm">
            <button
              type="button"
              onClick={() => dispatch({ type: "back-to-email" })}
              disabled={locked}
              className="text-foreground hover:cursor-pointer disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              <span className="block border-b border-muted-foreground in-disabled:opacity-50">
                Use a different email
              </span>
            </button>

            <button
              type="button"
              onClick={() => void send()}
              disabled={!resendable}
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
    return "Invalid code. It may have expired or been used.";
  }

  return error.message;
}
