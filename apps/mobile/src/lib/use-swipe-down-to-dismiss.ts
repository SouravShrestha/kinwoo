import { useNavigation } from "expo-router";
import { useCallback, useMemo } from "react";
import { Keyboard, useWindowDimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
const SETTLE_MS = 200;

// Worklets can't carry the Keyboard module to the UI thread, so runOnJS needs a plain function.
function dismissKeyboard() {
  Keyboard.dismiss();
}

// The pull only starts once the content is scrolled to the top; the anchor makes the sheet
// follow the finger from that point instead of jumping by the distance already scrolled.
export function useSwipeDownToDismiss(onDismiss: () => void) {
  const { height } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const dragY = useSharedValue(0);
  const anchor = useSharedValue<number | null>(null);
  const navigation = useNavigation();

  // The sheet is already off-screen, so the native exit animation would replay invisibly and
  // the transparent modal would swallow taps on the screen below until it finished.
  const dismissWithoutAnimation = useCallback(() => {
    navigation.setOptions({ animation: "none" });
    requestAnimationFrame(onDismiss);
  }, [navigation, onDismiss]);

  const scrollGesture = useMemo(() => Gesture.Native(), []);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-20, 20])
        .simultaneousWithExternalGesture(scrollGesture)
        .onStart(() => {
          anchor.set(null);
        })
        .onUpdate((event) => {
          let start = anchor.get();
          if (start === null) {
            if (scrollY.get() > 0 || event.translationY <= 0) return;
            start = event.translationY;
            anchor.set(start);
            runOnJS(dismissKeyboard)();
          }
          dragY.set(Math.max(0, event.translationY - start));
        })
        .onEnd((event) => {
          const drag = dragY.get();
          const pulled = anchor.get() !== null && drag > 0;
          if (pulled && (drag > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY)) {
            dragY.set(
              withTiming(height, { duration: SETTLE_MS }, (finished) => {
                if (finished) runOnJS(dismissWithoutAnimation)();
              }),
            );
            return;
          }
          dragY.set(withTiming(0, { duration: SETTLE_MS }));
        }),
    [anchor, dragY, height, dismissWithoutAnimation, scrollGesture, scrollY],
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  return { pan, scrollGesture, scrollY, onScroll, sheetStyle };
}
