import type { BottomTabBarProps } from "expo-router/tabs";
import { useEffect, useState } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { TAB_BAR_HEIGHT } from "@/lib/tab-bar";
import { useTheme } from "@/theme/ThemeProvider";

const PILL_INSET = 4;
// Same as the pill's vertical inset so its gap to the bar edge is even all round.
const PAD = PILL_INSET;
const BORDER = 1;
const SPRING = { damping: 18, stiffness: 240, mass: 0.7, reduceMotion: ReduceMotion.System };

type TabBarProps = BottomTabBarProps & { style?: StyleProp<ViewStyle> };

/** Floating tab bar whose active pill can be tapped or dragged between tabs. */
export function TabBar({ state, descriptors, navigation, style }: TabBarProps) {
  const { resolvedTheme, colors } = useTheme();
  const palette = colors[resolvedTheme];
  const count = state.routes.length;
  const [itemWidth, setItemWidth] = useState(0);
  // Tab under the pill while dragging, so its icon lights up before the drop.
  const [hover, setHover] = useState<number | null>(null);
  const x = useSharedValue(0);
  const dragging = useSharedValue(false);

  useEffect(() => {
    x.set(withSpring(state.index * itemWidth, SPRING));
  }, [state.index, itemWidth, x]);

  const select = (index: number) => {
    setHover(null);
    const route = state.routes[index];
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (index !== state.index && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    } else {
      x.set(withSpring(state.index * itemWidth, SPRING));
    }
  };

  // Activating cancels the Pressables' touch, so a drag never also counts as a tap.
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onStart(() => {
      dragging.set(true);
    })
    .onUpdate((event) => {
      const next = event.x - BORDER - PAD - itemWidth / 2;
      x.set(Math.min(Math.max(next, 0), (count - 1) * itemWidth));
    })
    .onEnd(() => {
      const index = Math.round(x.get() / itemWidth);
      x.set(withSpring(index * itemWidth, SPRING));
      runOnJS(select)(index);
    })
    .onFinalize(() => {
      dragging.set(false);
    });

  useAnimatedReaction(
    () => (dragging.get() && itemWidth > 0 ? Math.round(x.get() / itemWidth) : -1),
    (index, previous) => {
      if (index >= 0 && index !== previous) runOnJS(setHover)(index);
    },
    [itemWidth],
  );

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const shadow = `0 6px 17px ${resolvedTheme === "dark" ? "#00000080" : "#00000026"}`;

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityRole="tablist"
        onLayout={(event) => {
          const width = (event.nativeEvent.layout.width - (BORDER + PAD) * 2) / count;
          // Place the pill without animating on first layout.
          if (itemWidth === 0) x.set(state.index * width);
          setItemWidth(width);
        }}
        style={[
          {
            height: TAB_BAR_HEIGHT,
            flexDirection: "row",
            paddingHorizontal: PAD,
            borderRadius: TAB_BAR_HEIGHT / 2,
            borderWidth: BORDER,
            borderColor: palette.border,
            backgroundColor: palette.card,
            boxShadow: shadow,
          },
          style,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: PILL_INSET,
              bottom: PILL_INSET,
              left: PAD,
              width: itemWidth,
              borderRadius: TAB_BAR_HEIGHT / 2,
              // "14" is ~8% alpha on the 6-digit hex.
              backgroundColor: `${palette.foreground}14`,
            },
            pillStyle,
          ]}
        />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = index === state.index;
          const lit = (hover ?? state.index) === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={options.tabBarAccessibilityLabel}
              accessibilityState={{ selected: focused }}
              onPress={() => select(index)}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              {options.tabBarIcon?.({
                focused,
                color: lit ? palette.foreground : palette.iconMuted,
                size: 24,
              })}
            </Pressable>
          );
        })}
      </View>
    </GestureDetector>
  );
}
