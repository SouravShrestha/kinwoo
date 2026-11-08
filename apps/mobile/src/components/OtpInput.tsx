import { CheckIcon } from "@kinwoo/icons/native";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
} from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Keyframe,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { useTheme } from "@/theme/ThemeProvider";

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

/* The web components/ui/one-time-code (Bencho's "One-time code", MIT) on Reanimated: cells fill
   the row, digits rise in, verifying breathes, a wrong code shivers and fades out right to left,
   a right one draws the cells together into a "Verified" pill. One real input over the
   row keeps typing, paste and SMS autofill native; the cells only draw what it holds.
   ponytail: no goo filter on native (needs Skia), so the cells overlap the capsule instead of
   bridging into it; they shrink to its size so the end state is still one shape. */

/* the air between two cells; the cells take the rest of the row at Bencho's 36x44 */
const G = 12;
const ASPECT = 44 / 36;
const CORNER = 12;
/* the capsule is this much of a cell's height, and the cells shrink to it as they close in */
const SHAKE_MS = 620;
/* Bencho's per-frame merge spring (k 0.075, zeta 0.42 at 60Hz) as a physical one: a little
   under critical, so the capsule runs past its size and settles back */
const MERGE = { mass: 1, stiffness: 270, damping: 13.8 };
/* the caret's spring (k 0.2, velocity x0.62 per frame) */
const CARET = { mass: 1, stiffness: 720, damping: 29 };

const smooth = (a: number, b: number, v: number) => {
  "worklet";
  const u = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const unit = (v: number) => {
  "worklet";
  return Math.min(1, Math.max(0, v));
};

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
  const reduced = useReducedMotion();
  const { resolvedTheme, colors } = useTheme();
  const palette = colors[resolvedTheme];
  const [focused, setFocused] = useState(false);
  const [rowW, setRowW] = useState(0);
  const W = rowW ? (rowW - (length - 1) * G) / length : 0;
  const H = W * ASPECT;

  // The sheet clears a rejected code at once; the row keeps showing it while it fades out.
  const [lastFull, setLastFull] = useState("");
  if (value.length === length && value !== lastFull) setLastFull(value);
  const [draining, setDraining] = useState(false);
  const [prevError, setPrevError] = useState(error);
  if (error !== prevError) {
    setPrevError(error);
    if (error && !reduced) setDraining(true);
  }
  useEffect(() => {
    if (!draining) return;
    const timer = setTimeout(() => setDraining(false), SHAKE_MS + length * 45 + 160);
    return () => clearTimeout(timer);
  }, [draining, length]);
  const shown = draining ? lastFull : value;

  // Refocus on an error too, so the retry can be typed straight away. Deferred a frame: Android
  // ignores focus() on an input mounted in the same commit (the email field it replaces is still
  // detaching), and the keyboard never opens.
  useEffect(() => {
    if (!(autoFocus || error) || !presented) return;
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, error, presented]);

  // A right code is done with the keyboard: drop it while the capsule fuses.
  useEffect(() => {
    if (success) Keyboard.dismiss();
  }, [success]);

  /* the merge: 0 is a row of cells, 1 the capsule; the spring runs past 1 */
  const m = useSharedValue(0);
  useEffect(() => {
    m.value = reduced ? (success ? 1 : 0) : withSpring(success ? 1 : 0, MERGE);
  }, [m, success, reduced]);

  /* checking: a soft wave of breath through the cells */
  const wave = useSharedValue(0);
  useEffect(() => {
    if (!verifying || reduced) {
      cancelAnimation(wave);
      wave.value = 0;
      return;
    }
    wave.value = withRepeat(withTiming(900, { duration: 900, easing: Easing.linear }), -1);
  }, [wave, verifying, reduced]);

  /* a wrong code: a shiver down the row, read by every cell from one clock */
  const shakeT = useSharedValue(SHAKE_MS);
  useEffect(() => {
    if (!error || reduced) return;
    shakeT.value = 0;
    shakeT.value = withTiming(SHAKE_MS, { duration: SHAKE_MS, easing: Easing.linear });
  }, [error, reduced, shakeT]);

  /* the caret glides from cell to cell; it snaps the first time and when the row resizes */
  const caretX = useSharedValue(0);
  const caretW = useRef(0);
  const caretTarget = Math.min(shown.length, length - 1) * (W + G) + W / 2 - 1;
  useEffect(() => {
    const snap = reduced || caretW.current !== W;
    caretW.current = W;
    caretX.value = snap ? caretTarget : withSpring(caretTarget, CARET);
  }, [caretX, caretTarget, W, reduced]);

  const blink = useSharedValue(1);
  useEffect(() => {
    blink.value = reduced
      ? 1
      : withRepeat(
          withTiming(0.25, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        );
  }, [blink, reduced]);
  const showCaret = focused && !verifying && !success && !draining && shown.length < length;
  const caretStyle = useAnimatedStyle(() => ({
    opacity: blink.value,
    transform: [{ translateX: caretX.value }],
  }));

  /* the capsule a right code becomes: a pill hugging "✓ Verified" with padding round it */
  const [labelW, setLabelW] = useState(0);
  const fs = H * 0.24;
  const capH = fs * 2.2;
  const CAP = labelW + fs * 2.4;
  const capScale = H ? capH / H : 1;
  const capStyle = useAnimatedStyle(() => {
    const mc = unit(m.value);
    /* long and thin past its size, round again as it settles */
    const over = Math.max(-0.12, m.value - 1);
    const w = CAP * smooth(0.3, 1, mc) * (1 + over * 0.9);
    return {
      width: w,
      left: (rowW - w) / 2,
      opacity: w > 0.5 ? 1 : 0,
      transform: [{ scaleY: 1 - over * 0.55 }],
    };
  });
  const okStyle = useAnimatedStyle(() => {
    const t = smooth(0.72, 1, unit(m.value));
    return { opacity: t, transform: [{ scale: 0.92 + 0.08 * t }] };
  });

  /* a digit rises into its cell */
  const enter = useMemo(
    () =>
      reduced || !H
        ? undefined
        : new Keyframe({
            0: { opacity: 0, transform: [{ translateY: H * 0.2 }, { scale: 0.86 }] },
            100: {
              opacity: 1,
              transform: [{ translateY: 0 }, { scale: 1 }],
              easing: Easing.out(Easing.cubic),
            },
          }).duration(300),
    [H, reduced],
  );

  return (
    <View
      className={className}
      style={{ height: H || undefined }}
      onLayout={(event) => setRowW(event.nativeEvent.layout.width)}
    >
      {W > 0 ? (
        <>
          <Animated.View
            className="absolute bg-muted"
            style={[{ top: (H - capH) / 2, height: capH, borderRadius: capH / 2 }, capStyle]}
          />
          {Array.from({ length }, (_, i) => (
            <Cell
              key={i}
              i={i}
              n={length}
              W={W}
              H={H}
              ch={shown[i]}
              draining={draining}
              reduced={reduced}
              m={m}
              wave={wave}
              shakeT={shakeT}
              enter={enter}
              color={draining ? palette.destructive : palette.foreground}
              capScale={capScale}
            />
          ))}
          {showCaret ? (
            <Animated.View
              className="absolute w-0.5 rounded-full bg-foreground"
              style={[{ top: H * 0.295, height: H * 0.41 }, caretStyle]}
            />
          ) : null}
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 flex-row items-center justify-center gap-2"
            style={okStyle}
          >
            <View
              className="flex-row items-center"
              style={{ gap: fs * 0.5 }}
              onLayout={(event) => setLabelW(event.nativeEvent.layout.width)}
            >
              <CheckIcon size={Math.round(fs)} color={palette.foreground} />
              <Text className="font-normal text-foreground" style={{ fontSize: fs }}>
                Verified
              </Text>
            </View>
          </Animated.View>
        </>
      ) : null}
      <SheetTextInput
        ref={input}
        value={value}
        onChangeText={(text) => {
          if (verifying || success) return;
          if (draining) setDraining(false);
          const digits = text.replace(/\D/g, "");
          // A paste lands after the typed digits; a whole pasted code replaces them. No
          // maxLength, which would cut a pasted "482 913" before the space is cleaned out.
          const next = digits.length > length ? digits.slice(-length) : digits;
          onChangeText(next);
          if (next.length === length && next !== value) onComplete?.(next);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        // No caretHidden: Android disables the long-press Paste popup without a cursor. A
        // transparent selection colour hides the native caret instead.
        selectionColor="transparent"
        accessibilityLabel={success ? "Verified" : `${length}-digit code`}
        style={styles.input}
      />
    </View>
  );
}

function Cell({
  i,
  n,
  W,
  H,
  ch,
  draining,
  reduced,
  m,
  wave,
  shakeT,
  enter,
  color,
  capScale,
}: {
  i: number;
  n: number;
  W: number;
  H: number;
  ch: string | undefined;
  draining: boolean;
  reduced: boolean;
  m: SharedValue<number>;
  wave: SharedValue<number>;
  shakeT: SharedValue<number>;
  enter: ComponentProps<typeof Animated.Text>["entering"];
  color: string;
  capScale: number;
}) {
  /* a digit landing swells its cell a touch: four per cent, an acknowledgement, not an event */
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!ch || reduced) return;
    pop.value = withSequence(withTiming(1.04, { duration: 130 }), withTiming(1, { duration: 130 }));
  }, [ch, reduced, pop]);

  /* a wrong code fades out right to left, in place */
  const drain = useSharedValue(1);
  useEffect(() => {
    drain.value = draining
      ? withDelay(300 + (n - 1 - i) * 45, withTiming(0, { duration: 220 }))
      : 1;
  }, [draining, drain, i, n]);

  const cellStyle = useAnimatedStyle(() => {
    const mc = unit(m.value);
    const rowW = n * W + (n - 1) * G;
    const home = i * (W + G);
    const mid = (rowW - W) / 2;
    const t = shakeT.value;
    const shake =
      t < SHAKE_MS ? 5 * Math.exp(-t / 190) * Math.sin((t / 1000) * Math.PI * 20 + i * 0.55) : 0;
    const u = (wave.value / 900) * (n + 2) - i;
    const breath = u > 0 && u < 2 ? 1 - 0.07 * Math.sin((u / 2) * Math.PI) : 1;
    return {
      /* cells round off into the capsule's pill as they close in */
      borderRadius: CORNER + (H / 2 - CORNER) * smooth(0.15, 0.7, mc),
      transform: [
        { translateX: home + (mid - home) * mc + shake },
        { scale: pop.value * breath * (1 + (capScale - 1) * mc) },
      ],
    };
  });
  const digitStyle = useAnimatedStyle(() => ({
    opacity: (1 - smooth(0, 0.45, unit(m.value))) * drain.value,
  }));

  const fontSize = H * 0.45;
  return (
    <Animated.View
      className="absolute left-0 top-0 items-center justify-center bg-muted"
      style={[{ width: W, height: H }, cellStyle]}
    >
      {ch ? (
        <Animated.View style={digitStyle}>
          <Animated.Text
            key={`${i}-${ch}`}
            entering={enter}
            className="font-medium"
            style={{
              fontSize,
              letterSpacing: -0.02 * fontSize,
              color,
              fontVariant: ["tabular-nums"],
            }}
          >
            {ch}
          </Animated.Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Invisible but still focusable, tappable and offered the SMS code by the keyboard. Fully opaque
  // with transparent paint: iOS skips views under 0.01 alpha when hit-testing (0.01 itself rounds
  // below as a float), so a long-press never reached the input and Paste never showed.
  input: { ...StyleSheet.absoluteFill, color: "transparent", backgroundColor: "transparent" },
});
