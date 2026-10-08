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
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { TextField } from "./TextField";

const RESEND_COOLDOWN_MS = resendCooldownMsFrom(
  process.env.EXPO_PUBLIC_OTP_RESEND_COOLDOWN_SECONDS,
);

export function AuthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithEmail, verifyEmailCode } = useAuth();
  const [state, dispatch] = useReducer(otpReducer, INITIAL_OTP_STATE);

  // Drives the resend countdown label. Only ticks while the sheet is waiting on
  // a code, so it is not a permanent timer.
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

  const send = async () => {
    dispatch({ type: "submit-email", now: Date.now() });
    // The reducer rejected it; there is no request to make.
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
      // No close call here: a successful sign-in flips the auth state and the
      // caller unmounts this sheet.
    } catch (error) {
      dispatch({ type: "verify-failed", message: messageFor(error) });
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} label="Log in with email" scrollable={false}>
      {state.phase === "code" || state.phase === "verifying" ? (
        <View>
          <Text className="font- font-medium text-2xl text-foreground">Enter the code</Text>
          <Text className="mt-2 text-muted-foreground">
            Enter the {CODE_LENGTH} digit code sent to {state.email}
          </Text>

          <TextField
            kind="code"
            value={state.code}
            onChangeText={(value) => dispatch({ type: "edit-code", value })}
            disabled={busy}
            className="mt-6"
          />

          {state.error ? (
            <Text accessibilityLiveRegion="polite" className="mt-3 text-sm text-destructive">
              {state.error}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={verify}
            className={`mt-5 h-14 flex-row items-center justify-center rounded-3xl bg-primary ${busy ? "opacity-50" : "active:opacity-80"}`}
          >
            <Text className="font-semibold text-base text-primary-foreground">
              {busy ? "Checking…" : "Continue"}
            </Text>
          </Pressable>

          <View className="mt-4 flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              onPress={() => dispatch({ type: "back-to-email" })}
            >
              <Text className="text-sm text-muted-foreground underline">Use a different email</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!canResend(state, now) || busy}
              onPress={send}
            >
              <Text
                className={`text-sm underline ${canResend(state, now) && !busy ? "text-foreground" : "text-muted-foreground opacity-50"}`}
              >
                {canResend(state, now)
                  ? "Resend code"
                  : `Resend in ${resendSecondsRemaining(state, now)}s`}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View>
          <Text className="font-display-medium text-2xl text-foreground">Log in with email</Text>
          <Text className="mt-2 text-muted-foreground">
            We&apos;ll send you a {CODE_LENGTH}-digit code. No password needed.
          </Text>

          <TextField
            kind="email"
            value={state.email}
            onChangeText={(value) => dispatch({ type: "edit-email", value })}
            disabled={busy}
            className="mt-6"
          />

          {state.error ? (
            <Text accessibilityLiveRegion="polite" className="mt-3 text-sm text-destructive px-1">
              {state.error}
            </Text>
          ) : null}

          <Button label="Send code" onPress={send} loading={busy} className="mt-5" />
        </View>
      )}
    </BottomSheet>
  );
}

function messageFor(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Try again.";

  // Supabase's rate-limit copy mentions an interval that is not ours to promise.
  if (/rate limit/i.test(error.message)) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (/expired|invalid/i.test(error.message)) {
    return "That code has expired or was already used.";
  }

  return error.message;
}
