import { useIsFocused } from "expo-router";
import { useEffect, useRef, type ComponentType } from "react";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type { IconProps } from "@kinwoo/icons/native";

type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
  Active: ComponentType<IconProps>;
  Inactive: ComponentType<IconProps>;
};

// The tab bar renders each icon twice, once with focused=true and once with
// focused=false, and cross-fades them. The `focused` prop therefore never
// changes on an instance, so the animation is driven by the route's real focus.
export function TabBarIcon({ focused, color, size, Active, Inactive }: TabBarIconProps) {
  const scale = useSharedValue(1);
  const routeFocused = useIsFocused();
  const wasRouteFocused = useRef(routeFocused);

  useEffect(() => {
    if (wasRouteFocused.current === routeFocused) return;
    wasRouteFocused.current = routeFocused;

    if (routeFocused && focused) {
      scale.value = 0.8;
      scale.value = withSpring(1, {
        damping: 7,
        stiffness: 220,
        mass: 0.6,
        reduceMotion: ReduceMotion.System,
      });
    } else if (!routeFocused && !focused) {
      scale.value = 1.1;
      scale.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [routeFocused, focused, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const Icon = focused ? Active : Inactive;

  return (
    <Animated.View style={style}>
      <Icon size={size} color={color} />
    </Animated.View>
  );
}
