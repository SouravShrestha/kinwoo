import { useEffect, useRef, useState, type ComponentRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { SheetTextInput, useSheetPresented } from "./BottomSheet";

type OtpInputProps = {
  length: number;
  value: string;
  onChangeText: (value: string) => void;
  /** Called once the last box is filled – typed, pasted or autofilled */
  onComplete?: (code: string) => void;
  error?: boolean;
  verifying?: boolean;
  success?: boolean;
  autoFocus?: boolean;
  className?: string;
};

// Mirrors the web ui/otp-input: one real input over the boxes keeps typing, paste and SMS autofill
// native; the boxes only draw what it holds.
export function OtpInput({
  length,
  value,
  onChangeText,
  onComplete,
  error = false,
  verifying = false,
  success = false,
  autoFocus,
  className,
}: OtpInputProps) {
  const input = useRef<ComponentRef<typeof SheetTextInput>>(null);
  const presented = useSheetPresented();
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, length - 1);

  // Refocus on an error too, so the retry can be typed straight away.
  useEffect(() => {
    if ((autoFocus || error) && presented) input.current?.focus();
  }, [autoFocus, error, presented]);

  // A calm shake when a code is rejected.
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!error || reducedMotion) return;
    shake.value = withSequence(...[-6, 5, -3, 2, 0].map((x) => withTiming(x, { duration: 70 })));
  }, [error, reducedMotion, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const caret = useSharedValue(1);
  useEffect(() => {
    caret.value = reducedMotion
      ? 1
      : withRepeat(
          withSequence(withTiming(0, { duration: 550 }), withTiming(1, { duration: 550 })),
          -1,
        );
  }, [caret, reducedMotion]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  const boxes = Array.from({ length }, (_, i) => {
    const ch = value[i];
    const isActive = focused && !verifying && !success && i === active;
    // On an error only the active box turns red; the inactive ones all take the muted outline.
    const border = success
      ? "border-2 border-positive"
      : isActive
        ? `border-2 ${error ? "border-destructive" : "border-foreground"}`
        : ch || error
          ? "border border-muted-foreground"
          : "border border-border";
    return (
      <View
        key={i}
        className={`aspect-square flex-1 items-center justify-center rounded-xl ${ch ? "bg-card" : "bg-muted"} ${border}`}
        style={styles.cell}
      >
        {ch ? (
          <Animated.Text
            key={`${i}-${ch}`}
            entering={ZoomIn.duration(200)}
            className="font-medium text-2xl text-foreground"
          >
            {ch}
          </Animated.Text>
        ) : isActive ? (
          <Animated.View
            className={`h-6 w-0.5 rounded-full ${error ? "bg-destructive" : "bg-foreground"}`}
            style={caretStyle}
          />
        ) : null}
      </View>
    );
  });

  return (
    <Animated.View
      className={`flex-row gap-2 ${verifying ? "opacity-60" : ""} ${className ?? ""}`}
      style={shakeStyle}
    >
      {boxes}
      <SheetTextInput
        ref={input}
        value={value}
        onChangeText={(text) => {
          if (verifying || success) return;
          const next = text.replace(/\D/g, "").slice(0, length);
          onChangeText(next);
          if (next.length === length && next !== value) onComplete?.(next);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        caretHidden
        accessibilityLabel={`${length}-digit code`}
        style={styles.input}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, maxWidth: 56 },
  // Invisible but still focusable, tappable and offered the SMS code by the keyboard.
  input: { ...StyleSheet.absoluteFill, opacity: 0, color: "transparent" },
});
