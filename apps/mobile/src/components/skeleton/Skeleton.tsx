import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// Pulses opacity instead of sweeping a gradient: no gradient library is installed.
// Reanimated skips the loop when the device asks for reduced motion.
export function Skeleton({ className = "" }: { className?: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View className={`rounded-md bg-border ${className}`} style={style} />;
}

export function SkeletonRegion({
  children,
  className,
  label = "Loading",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      className={className}
    >
      {children}
    </View>
  );
}

// Line boxes match the real text styles (NativeWind size and line-height), so a skeleton takes
// the same height as the text it stands in for.
const LINE = {
  xs: ["h-4", "h-[9px]"],
  sm: ["h-5", "h-[11px]"],
  base: ["h-6", "h-3"],
  lg: ["h-7", "h-[14px]"],
  xl: ["h-7", "h-[15px]"],
  "2xl": ["h-8", "h-[18px]"],
  "3xl": ["h-9", "h-[21px]"],
} as const;

const ALIGN = { start: "items-start", center: "items-center", end: "items-end" } as const;

export function SkeletonText({
  size,
  className = "",
  align = "start",
}: {
  size: keyof typeof LINE;
  className?: string;
  align?: keyof typeof ALIGN;
}) {
  const [line, bar] = LINE[size];
  return (
    <View className={`${line} justify-center ${ALIGN[align]}`}>
      <Skeleton className={`${bar} ${className}`} />
    </View>
  );
}
