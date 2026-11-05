import { useBusyWhile } from "@kinwoo/client/activity";
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
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { OtpInput } from "./OtpInput";
import { TextField } from "./TextField";

const RESEND_COOLDOWN_MS = resendCooldownMsFrom(
  process.env.EXPO_PUBLIC_OTP_RESEND_COOLDOWN_SECONDS,
);

// No text-underline-offset in React Native: the underline is a bottom border, this is the gap.
const UNDERLINE_STYLE = { paddingBottom: 0 } as const;

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

  const [verified, setVerified] = useState(false);
  if (!open && verified) setVerified(false);

  const busy = state.phase === "sending" || state.phase === "verifying";
  useBusyWhile(busy && !verified);

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
  const verify = async (code: string) => {
    dispatch({ type: "submit-code" });
    if (code.length !== CODE_LENGTH) return;

    try {
      await verifyEmailCode(state.email, code);
      // Show success before closing. AuthGate waits this long too, so the display-name sheet
      // does not stack on top of this one.
      setVerified(true);
      setTimeout(onClose, OTP_SUCCESS_HOLD_MS);
    } catch (error) {
      dispatch({ type: "verify-failed", message: messageFor(error) });
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} label="Home is just a login away" scrollable={false}>
      {state.phase === "code" || state.phase === "verifying" ? (
        <View>
          <Text className="font- font-medium text-2xl text-foreground">
            Just a little verification
          </Text>
          <Text className="mt-2 text-muted-foreground">Your code has landed at {state.email}</Text>

          <OtpInput
            autoFocus
            length={CODE_LENGTH}
            value={state.code}
            onChangeText={(value) => dispatch({ type: "edit-code", value })}
            onComplete={(code) => void verify(code)}
            error={!!state.error}
            verifying={state.phase === "verifying" && !verified}
            success={verified}
            className="mt-10"
          />

          {verified ? (
            <Text
              accessibilityLiveRegion="polite"
              className="mt-3 text-center text-sm font-normal text-positive"
            >
              Verified
            </Text>
          ) : state.error ? (
            <Text
              accessibilityLiveRegion="polite"
              className="mt-3 text-center text-sm font-normal text-destructive"
            >
              {state.error}
            </Text>
          ) : null}

          <View className="mt-10 flex-row items-center justify-between px-1">
            <Pressable
              accessibilityRole="button"
              onPress={() => dispatch({ type: "back-to-email" })}
            >
              <View className="border-b border-muted-foreground" style={UNDERLINE_STYLE}>
                <Text className="text-sm text-foreground">Use a different email</Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!canResend(state, now) || busy}
              onPress={send}
            >
              <View
                className={`border-b ${canResend(state, now) && !busy ? "border-foreground" : "border-muted-foreground opacity-50"}`}
                style={UNDERLINE_STYLE}
              >
                <Text
                  className={`text-sm ${canResend(state, now) && !busy ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {canResend(state, now)
                    ? "Resend code"
                    : `Resend in ${resendSecondsRemaining(state, now)}s`}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      ) : (
        <View>
          <Text className="font-display-medium text-2xl text-foreground">
            Home is just a login away
          </Text>
          <Text className="mt-2 text-muted-foreground">
            Your email, and we'll take it from here.
          </Text>

          <TextField
            kind="email"
            autoFocus
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
