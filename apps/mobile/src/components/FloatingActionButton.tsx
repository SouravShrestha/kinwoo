import { BlurView } from "expo-blur";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { PlusIcon } from "@kinwoo/icons/native";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

export type FabAction = { label: string; icon: (color: string) => ReactNode; onSelect: () => void };

const SIZE = 48;
const STAGGER_MS = 50;
const MENU_WIDTH = 240;
// Ease-out tween, no spring: the menu settles without overshooting.
const DURATION = 200;
const EASE = Easing.bezier(0.23, 1, 0.32, 1);

// Native twin of the web FloatingActionButton: actions slide up above the + and it turns into a ×.
export function FloatingActionButton({
  actions,
  label = "Add",
  style,
  blurTarget,
}: {
  actions: readonly FabAction[];
  label?: string;
  style?: StyleProp<ViewStyle>;
  // Android only blurs what sits inside this BlurTargetView.
  blurTarget?: RefObject<View | null>;
}) {
  const { resolvedTheme, colors } = useTheme();
  const palette = colors[resolvedTheme];
  const [open, setOpen] = useState(false);
  const rotate = useSharedValue(0);
  const dark = resolvedTheme === "dark";
  const shadow = `0 6px 17px ${dark ? "#00000080" : "#00000040"}`;
  const actionShadow = `0 10px 28px ${dark ? "#00000080" : "#00000026"}`;

  useEffect(() => {
    rotate.value = withTiming(open ? 45 : 0, {
      duration: DURATION,
      easing: EASE,
      reduceMotion: ReduceMotion.System,
    });
  }, [open, rotate]);

  const plusStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));

  return (
    <>
      {open ? (
        // Invisible backdrop: a tap anywhere else closes the menu.
        <Pressable
          accessibilityLabel="Close add menu"
          onPress={() => setOpen(false)}
          className="active:opacity-100"
          style={StyleSheet.absoluteFill}
        >
          <Animated.View
            entering={FadeIn.duration(DURATION).reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <BlurView
              intensity={6}
              blurTarget={blurTarget}
              blurMethod="dimezisBlurViewSdk31Plus"
              tint={dark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Pressable>
      ) : null}
      <View style={style} pointerEvents="box-none">
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: 0,
            bottom: SIZE + 20,
            // Absolute children are sized to the 48px wrapper; give labels room so they don't wrap.
            width: MENU_WIDTH,
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          {open
            ? actions.map((action, index) => {
                const delay = (actions.length - 1 - index) * STAGGER_MS;
                return (
                  <Animated.View
                    key={action.label}
                    entering={FadeInDown.duration(DURATION)
                      .easing(EASE)
                      .delay(delay)
                      .reduceMotion(ReduceMotion.System)}
                    exiting={FadeOutDown.duration(150).reduceMotion(ReduceMotion.System)}
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setOpen(false);
                        action.onSelect();
                      }}
                      className="flex-row items-center rounded-full active:opacity-90"
                      style={{
                        gap: 10,
                        paddingLeft: 16,
                        paddingRight: 20,
                        paddingVertical: 14,
                        borderWidth: 1,
                        borderColor: palette.border,
                        backgroundColor: palette.card,
                        boxShadow: actionShadow,
                      }}
                    >
                      {action.icon(palette.primary)}
                      <Text
                        numberOfLines={1}
                        className="font-display text-sm font-medium text-foreground"
                      >
                        {action.label}
                      </Text>
                    </Pressable>
                  </Animated.View>
                );
              })
            : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? "Close add menu" : label}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          className="items-center justify-center rounded-full bg-primary active:opacity-90"
          style={{ width: SIZE, height: SIZE, boxShadow: shadow }}
        >
          <Animated.View style={plusStyle} pointerEvents="none">
            <PlusIcon color={palette.primaryForeground} />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}
