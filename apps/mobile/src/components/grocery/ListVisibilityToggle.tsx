import type { ListVisibility } from "@kinwoo/core/grocery";
import { LockFilledIcon, WorldIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

const SEGMENT_WIDTH = 56;
const GAP = 4;

export function ListVisibilityToggle({
  value,
  onChange,
  disabled,
}: {
  value: ListVisibility;
  onChange: (visibility: ListVisibility) => void;
  disabled?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const isPublic = value === "shared";

  const progress = useSharedValue(isPublic ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isPublic ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [isPublic, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (SEGMENT_WIDTH + GAP) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Public list"
      accessibilityState={{ checked: isPublic, disabled }}
      disabled={disabled}
      onPress={() => onChange(isPublic ? "private" : "shared")}
      allowDoublePress
      className={`h-12 flex-row items-center gap-1 rounded-xl bg-muted p-1 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Animated.View
        pointerEvents="none"
        className="absolute left-1 top-1 h-10 w-14 rounded-lg"
        style={[{ backgroundColor: palette.foreground }, pillStyle]}
      />
      <View className="h-10 w-14 items-center justify-center">
        <LockFilledIcon size={16} color={isPublic ? palette.foreground : palette.background} />
      </View>
      <View className="h-10 w-14 items-center justify-center">
        <WorldIcon size={16} color={isPublic ? palette.background : palette.foreground} />
      </View>
    </Pressable>
  );
}
