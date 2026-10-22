import { GROCERY_TABS, type GroceryTabKey } from "@kinwoo/core/grocery";
import {
  BadgeCheckActiveIcon,
  BadgeCheckIcon,
  PendingActiveIcon,
  PendingIcon,
  UserCircleActiveIcon,
  UserCircleIcon,
  type IconProps,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

type Palette = (typeof colors)[keyof typeof colors];
type TabLayout = { x: number; width: number };

const TAB_ICONS: Record<
  GroceryTabKey,
  { outline: ComponentType<IconProps>; filled: ComponentType<IconProps> }
> = {
  pending: { outline: PendingIcon, filled: PendingActiveIcon },
  assigned: { outline: UserCircleIcon, filled: UserCircleActiveIcon },
  bought: { outline: BadgeCheckIcon, filled: BadgeCheckActiveIcon },
};

const TAB_ICON_SIZES: Record<GroceryTabKey, number> = { pending: 14, assigned: 17, bought: 17 };

const TAB_INDICES = GROCERY_TABS.map((_, i) => i);
const INDICATOR_HEIGHT = 1.6;

const tabIndex = (key: GroceryTabKey) => GROCERY_TABS.findIndex((tab) => tab.key === key);

// Tabs over a horizontal pager. Each page scrolls vertically on its own; the underline and
// label colours track the pager's scroll position, and `value` settles once a swipe ends.
export function GroceryTabView({
  value,
  onChange,
  between,
  renderPage,
}: {
  value: GroceryTabKey;
  onChange: (value: GroceryTabKey) => void;
  between?: ReactNode;
  renderPage: (key: GroceryTabKey) => ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const pagerRef = useAnimatedRef<Animated.ScrollView>();
  const progress = useSharedValue(tabIndex(value));
  // Collected on the JS side and published as one array: the tabs report their layouts in the
  // same tick, and read-modify-writes of a shared value from JS can drop earlier ones.
  const measuredRef = useRef<(TabLayout | null)[]>(GROCERY_TABS.map(() => null));
  const layouts = useSharedValue<TabLayout[] | null>(null);

  const measureTab = (index: number, layout: TabLayout) => {
    measuredRef.current[index] = layout;
    const complete = measuredRef.current.filter((entry): entry is TabLayout => entry !== null);
    if (complete.length === GROCERY_TABS.length) layouts.value = complete;
  };

  const settle = (index: number) => {
    const key = GROCERY_TABS[index]?.key;
    if (key) onChange(key);
  };

  // Page a tab press is animating towards, or -1. Scroll events from that animation must not be
  // read as a swipe settling on a page along the way.
  const pressTarget = useSharedValue(-1);

  // Applied once: a changing `contentOffset` prop is re-applied natively and would cancel the
  // animated scroll started by a tab press.
  const [initialOffset] = useState(() => ({ x: tabIndex(value) * width, y: 0 }));

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      progress.value = event.contentOffset.x / width;
    },
    onBeginDrag: () => {
      pressTarget.value = -1;
    },
    onMomentumEnd: (event) => {
      const index = Math.round(event.contentOffset.x / width);
      if (pressTarget.value !== -1 && pressTarget.value !== index) return;
      pressTarget.value = -1;
      runOnJS(settle)(index);
    },
  });

  const select = (key: GroceryTabKey) => {
    const index = tabIndex(key);
    pressTarget.value = reducedMotion ? -1 : index;
    pagerRef.current?.scrollTo({ x: index * width, y: 0, animated: !reducedMotion });
    onChange(key);
  };

  const indicatorStyle = useAnimatedStyle(() => {
    const measured = layouts.value;
    if (!measured) return { opacity: 0 };
    const xs = measured.map((layout) => layout.x);
    const widths = measured.map((layout) => layout.width);
    return {
      opacity: 1,
      width: interpolate(progress.value, TAB_INDICES, widths, Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(progress.value, TAB_INDICES, xs, Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View className="flex-1">
      <View
        accessibilityRole="tablist"
        className="flex-row justify-between border-border px-2"
        style={{ borderBottomWidth: INDICATOR_HEIGHT }}
      >
        {GROCERY_TABS.map((tab, i) => (
          <TabButton
            key={tab.key}
            index={i}
            title={tab.title}
            icons={TAB_ICONS[tab.key]}
            iconSize={TAB_ICON_SIZES[tab.key]}
            active={tab.key === value}
            progress={progress}
            palette={palette}
            onPress={() => select(tab.key)}
            onMeasure={(layout) => measureTab(i, layout)}
          />
        ))}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 0,
              bottom: -INDICATOR_HEIGHT,
              height: INDICATOR_HEIGHT,
              backgroundColor: palette.foreground,
            },
            indicatorStyle,
          ]}
        />
      </View>

      {between}

      <Animated.ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentOffset={initialOffset}
        className="flex-1"
      >
        {GROCERY_TABS.map((tab) => (
          <View
            key={tab.key}
            style={{ width }}
            accessibilityElementsHidden={tab.key !== value}
            importantForAccessibility={tab.key === value ? "auto" : "no-hide-descendants"}
          >
            {renderPage(tab.key)}
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function TabButton({
  index,
  title,
  icons,
  iconSize,
  active,
  progress,
  palette,
  onPress,
  onMeasure,
}: {
  index: number;
  title: string;
  iconSize: number;
  icons: (typeof TAB_ICONS)[GroceryTabKey];
  active: boolean;
  progress: SharedValue<number>;
  palette: Palette;
  onPress: () => void;
  onMeasure: (layout: TabLayout) => void;
}) {
  // The muted/regular and active/medium labels are stacked and crossfade with the swipe, so a
  // label is fully lit only when its page is fully in view. An invisible medium copy sizes the
  // tab, keeping its width (and the underline) steady as the weight changes.
  const activeLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(progress.value - index), [0, 1], [1, 0], Extrapolation.CLAMP),
  }));
  const inactiveLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(progress.value - index), [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const scale = useSharedValue(1);
  const wasActive = useRef(active);
  useEffect(() => {
    if (wasActive.current === active) return;
    wasActive.current = active;
    if (active) {
      scale.value = 0.8;
      scale.value = withSpring(1, {
        damping: 7,
        stiffness: 220,
        mass: 0.6,
        reduceMotion: ReduceMotion.System,
      });
    } else {
      scale.value = 1.1;
      scale.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [active, scale]);
  const iconScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const content = (color: string, font: "font-display-normal" | "font-display-medium") => {
    const Icon = font === "font-display-medium" ? icons.filled : icons.outline;
    return (
      <>
        <Animated.View style={iconScaleStyle}>
          <Icon size={iconSize} color={color} />
        </Animated.View>
        <Text className={`${font} text-base`} style={{ color }}>
          {title}
        </Text>
      </>
    );
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={title}
      onPress={onPress}
      allowDoublePress
      onLayout={(event) => {
        const { x, width } = event.nativeEvent.layout;
        onMeasure({ x, width });
      }}
      className="px-3 py-3.5 active:opacity-70"
    >
      <View style={[styles.row, { opacity: 0 }]}>
        {content(palette.foreground, "font-display-medium")}
      </View>
      <Animated.View pointerEvents="none" style={[styles.layer, inactiveLayerStyle]}>
        {content(palette.mutedForeground, "font-display-normal")}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.layer, activeLayerStyle]}>
        {content(palette.foreground, "font-display-medium")}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  layer: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
