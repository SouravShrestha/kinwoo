import { toast, useToast, type ToastState } from "@kinwoo/client/toast";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ENTER_MS = 180;
const EXIT_MS = 200;
const OFFSET = -12;
const DISMISS_DISTANCE = 40;
const DISMISS_VELOCITY = 600;

function ToastBody({ toast: state }: { toast: ToastState }) {
  const dragY = useSharedValue(0);

  const swipeUp = Gesture.Pan()
    .activeOffsetY(-8)
    .onUpdate((event) => {
      dragY.value = Math.min(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY < -DISMISS_DISTANCE || event.velocityY < -DISMISS_VELOCITY) {
        runOnJS(toast.dismiss)();
        return;
      }
      dragY.value = withTiming(0, { duration: ENTER_MS });
    });

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  return (
    <GestureDetector gesture={swipeUp}>
      <Animated.View
        accessibilityRole={state.variant === "error" ? "alert" : undefined}
        accessibilityLiveRegion="polite"
        accessibilityActions={[{ name: "dismiss", label: "Dismiss" }]}
        onAccessibilityAction={() => toast.dismiss()}
        className="w-full bg-foreground px-4 py-3"
        style={dragStyle}
      >
        <Text className="text-center text-sm font-medium tracking-wide text-background">
          {state.message}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

export function ToastHost() {
  const current = useToast();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<ToastState | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(OFFSET);

  if (current && current !== shown) setShown(current);

  useEffect(() => {
    if (current) {
      opacity.value = withTiming(1, { duration: ENTER_MS });
      translateY.value = withTiming(0, { duration: ENTER_MS });
      return;
    }
    opacity.value = withTiming(0, { duration: EXIT_MS });
    translateY.value = withTiming(OFFSET, { duration: EXIT_MS });
    const timer = setTimeout(() => setShown(null), EXIT_MS);
    return () => clearTimeout(timer);
  }, [current, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!shown) return null;

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 top-0" style={{ zIndex: 10000 }}>
      <Animated.View style={[animatedStyle, { marginTop: insets.top }]}>
        <ToastBody key={shown.id} toast={shown} />
      </Animated.View>
    </View>
  );
}
