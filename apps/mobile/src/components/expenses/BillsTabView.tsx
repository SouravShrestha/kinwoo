import { CloudLockFilledIcon, GlobeFilledIcon, type IconProps } from "@kinwoo/icons/native";
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

export type BillsView = "shared" | "private";

type Palette = (typeof colors)[keyof typeof colors];
type TabLayout = { x: number; width: number };

const VIEWS: readonly BillsView[] = ["shared", "private"];
const VIEW_INDICES = VIEWS.map((_, i) => i);
const LABELS: Record<BillsView, string> = { shared: "Shared", private: "Private" };
const ICONS: Record<
  BillsView,
  { outline: ComponentType<IconProps>; filled: ComponentType<IconProps> }
> = {
  shared: { outline: GlobeFilledIcon, filled: GlobeFilledIcon },
  private: { outline: CloudLockFilledIcon, filled: CloudLockFilledIcon },
};
const ICON_SIZES: Record<BillsView, number> = { shared: 17, private: 17 };
const INDICATOR_HEIGHT = 1.6;
const INDICATOR_WIDTH_RATIO = 0.65;
const INDICATOR_INSET_RATIO = (1 - INDICATOR_WIDTH_RATIO) / 2;

// Tabs over a horizontal pager. Each page scrolls vertically on its own; the underline and
// label colours track the pager's scroll position, and `value` settles once a swipe ends.
export function BillsTabView({
  value,
  onChange,
  renderPage,
}: {
  value: BillsView;
  onChange: (value: BillsView) => void;
  renderPage: (view: BillsView) => ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const pagerRef = useAnimatedRef<Animated.ScrollView>();
  const progress = useSharedValue(VIEWS.indexOf(value));

  // Published as one array: the tabs report their layouts in the same tick, and read-modify-writes
  // of a shared value from JS can drop earlier ones.
  const measuredRef = useRef<(TabLayout | null)[]>(VIEWS.map(() => null));
  const layouts = useSharedValue<TabLayout[] | null>(null);
  const measureTab = (index: number, layout: TabLayout) => {
    measuredRef.current[index] = layout;
    const complete = measuredRef.current.filter((entry): entry is TabLayout => entry !== null);
    if (complete.length === VIEWS.length) layouts.value = complete;
  };

  const settle = (index: number) => {
    const view = VIEWS[index];
    if (view) onChange(view);
  };

  // Page a tab press is animating towards, or -1. Scroll events from that animation must not be
  // read as a swipe settling on a page along the way.
  const pressTarget = useSharedValue(-1);

  // Applied once: a changing `contentOffset` prop is re-applied natively and would cancel the
  // animated scroll started by a tab press.
  const [initialOffset] = useState(() => ({ x: VIEWS.indexOf(value) * width, y: 0 }));

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

  const select = (view: BillsView) => {
    const index = VIEWS.indexOf(view);
    pressTarget.value = reducedMotion ? -1 : index;
    pagerRef.current?.scrollTo({ x: index * width, y: 0, animated: !reducedMotion });
    onChange(view);
  };

  const indicatorStyle = useAnimatedStyle(() => {
    const measured = layouts.value;
    if (!measured) return { opacity: 0 };
    return {
      opacity: 1,
      width: interpolate(
        progress.value,
        VIEW_INDICES,
        measured.map((layout) => layout.width * INDICATOR_WIDTH_RATIO),
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            progress.value,
            VIEW_INDICES,
            measured.map((layout) => layout.x + layout.width * INDICATOR_INSET_RATIO),
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <View className="flex-1">
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Bills view"
        className="flex-row border-border"
        style={{ borderBottomWidth: INDICATOR_HEIGHT }}
      >
        {VIEWS.map((view, i) => (
          <TabButton
            key={view}
            index={i}
            view={view}
            active={view === value}
            progress={progress}
            palette={palette}
            onPress={() => select(view)}
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
        {VIEWS.map((view) => (
          <View
            key={view}
            style={{ width }}
            accessibilityElementsHidden={view !== value}
            importantForAccessibility={view === value ? "auto" : "no-hide-descendants"}
          >
            {renderPage(view)}
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function TabButton({
  index,
  view,
  active,
  progress,
  palette,
  onPress,
  onMeasure,
}: {
  index: number;
  view: BillsView;
  active: boolean;
  progress: SharedValue<number>;
  palette: Palette;
  onPress: () => void;
  onMeasure: (layout: TabLayout) => void;
}) {
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
    const Icon = font === "font-display-medium" ? ICONS[view].filled : ICONS[view].outline;
    return (
      <>
        <Animated.View style={iconScaleStyle}>
          <Icon size={ICON_SIZES[view]} color={color} />
        </Animated.View>
        <Text className={`${font} text-base`} style={{ color }}>
          {LABELS[view]}
        </Text>
      </>
    );
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={LABELS[view]}
      onPress={onPress}
      allowDoublePress
      onLayout={(event) => {
        const { x, width } = event.nativeEvent.layout;
        onMeasure({ x, width });
      }}
      className="flex-1 items-center justify-center px-3 py-3.5 active:opacity-70"
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
