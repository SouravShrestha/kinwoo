import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Pressable } from "@/components/Pressable";
import { SwipeDownScreen } from "@/components/SwipeDownScreen";
import { goBack } from "@/lib/house-navigation";
import { useKeyboardVisible } from "@/lib/use-keyboard-visible";
import { useSwipeDownToDismiss } from "@/lib/use-swipe-down-to-dismiss";
import { useTheme } from "@/theme/ThemeProvider";

const HERO_ANIMATION_MS = 250;

type Hero = { heading: string };

export function HouseScreen({
  title,
  hero,
  dismissible = false,
  scrollOnlyWithKeyboard = false,
  noBack = false,
  children,
}: {
  title: string;
  hero?: Hero;
  dismissible?: boolean;
  scrollOnlyWithKeyboard?: boolean;
  noBack?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const keyboardVisible = useKeyboardVisible();
  const collapsed = hero !== undefined && keyboardVisible;
  const collapse = useSharedValue(0);
  const { pan, scrollGesture, onScroll, sheetStyle } = useSwipeDownToDismiss(goBack);

  useEffect(() => {
    collapse.value = withTiming(collapsed ? 1 : 0, {
      duration: HERO_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [collapse, collapsed]);

  const titleStyle = useAnimatedStyle(() => ({ opacity: hero ? collapse.value : 1 }));

  const header = (
    <View
      className={`flex-row items-center pb-4 ${noBack ? "px-6" : "px-5"}`}
      style={{ paddingTop: insets.top + (noBack ? 40 : dismissible ? 20 : 12) }}
    >
      {noBack ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dismissible ? "Close" : "Back"}
          onPress={goBack}
          hitSlop={12}
          className="mr-2 size-9 items-start justify-center"
        >
          <View style={{ transform: [{ rotate: dismissible ? "90deg" : "180deg" }] }}>
            <ArrowRightIcon size={26} color={palette.foreground} />
          </View>
        </Pressable>
      )}

      <Animated.Text
        accessibilityRole="header"
        accessibilityElementsHidden={hero !== undefined && !collapsed}
        importantForAccessibility={
          hero !== undefined && !collapsed ? "no-hide-descendants" : "auto"
        }
        className="flex-1 font-display-medium text-2xl text-foreground"
        numberOfLines={1}
        style={titleStyle}
      >
        {title}
      </Animated.Text>
    </View>
  );

  const scroll = (
    <Animated.ScrollView
      className="flex-1"
      scrollEnabled={!scrollOnlyWithKeyboard || keyboardVisible}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onScroll={dismissible ? onScroll : undefined}
      scrollEventThrottle={16}
      // Overscroll at the top would fight the pull-down; the sheet itself gives the feedback.
      bounces={!dismissible}
      overScrollMode={dismissible ? "never" : "auto"}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
    >
      {dismissible ? header : null}
      <View className="px-6 pt-2">
        {hero ? (
          <CollapsibleHero collapse={collapse} collapsed={collapsed}>
            <Text
              accessibilityRole="header"
              className="mb-2 font-display-medium text-3xl text-foreground"
            >
              {hero.heading}
            </Text>
          </CollapsibleHero>
        ) : null}
        {children}
      </View>
    </Animated.ScrollView>
  );

  const screen = (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      {/* Dismissible screens are presented as sheets, whose header scrolls away with the content. */}
      {dismissible ? null : header}
      {dismissible ? <GestureDetector gesture={scrollGesture}>{scroll}</GestureDetector> : scroll}
    </KeyboardAvoidingView>
  );

  return dismissible ? (
    <SwipeDownScreen pan={pan} sheetStyle={sheetStyle}>
      {screen}
    </SwipeDownScreen>
  ) : (
    screen
  );
}

// The content is pinned to the bottom of a shrinking, clipped box, so it reads as sliding up
// while everything below moves up with it.
function CollapsibleHero({
  collapse,
  collapsed,
  children,
}: {
  collapse: SharedValue<number>;
  collapsed: boolean;
  children: ReactNode;
}) {
  const [height, setHeight] = useState<number | null>(null);

  const style = useAnimatedStyle(() =>
    height === null ? {} : { height: height * (1 - collapse.value), opacity: 1 - collapse.value },
  );

  return (
    <Animated.View
      style={[{ overflow: "hidden" }, style]}
      pointerEvents={collapsed ? "none" : "auto"}
      accessibilityElementsHidden={collapsed}
      importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}
    >
      <View
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
        style={height === null ? undefined : { position: "absolute", bottom: 0, left: 0, right: 0 }}
      >
        {children}
      </View>
    </Animated.View>
  );
}
