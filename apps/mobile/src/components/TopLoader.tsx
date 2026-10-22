import { useIsBusy } from "@kinwoo/client/activity";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FINISH_MS = 200;

export function TopLoader() {
  const busy = useIsBusy();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (busy) {
      opacity.value = withTiming(1, { duration: 200 });
      progress.value = withTiming(0.9, { duration: 5000, easing: Easing.out(Easing.cubic) });
      return;
    }
    if (opacity.value === 0) return;
    progress.value = withTiming(1, { duration: FINISH_MS }, () => {
      opacity.value = withTiming(0, { duration: FINISH_MS }, () => {
        progress.value = 0;
      });
    });
  }, [busy, opacity, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    opacity: opacity.value,
  }));

  return (
    <View
      style={[StyleSheet.absoluteFill, { height: 4, top: insets.top, zIndex: 9999 }]}
      pointerEvents="none"
    >
      <Animated.View className="h-full bg-foreground" style={animatedStyle} />
    </View>
  );
}
