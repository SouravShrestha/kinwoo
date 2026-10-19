import { colors } from "@kinwoo/tokens/native";
import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

export function Switch({
  checked,
  disabled,
  onChange,
  accessibilityLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const progress = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [checked, progress]);
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 20 }],
    backgroundColor: checked ? palette.background : palette.mutedForeground,
  }));
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: checked ? palette.foreground : `${palette.mutedForeground}4D`,
  }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      onPress={() => onChange(!checked)}
      disabled={disabled}
      allowDoublePress
      className={disabled ? "opacity-50" : "active:opacity-80"}
    >
      <Animated.View className="h-7 w-12 justify-center rounded-full px-1" style={trackStyle}>
        <Animated.View className="size-5 rounded-full" style={knobStyle} />
      </Animated.View>
    </Pressable>
  );
}
