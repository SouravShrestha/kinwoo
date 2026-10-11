import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useEffect, useState, type ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Pressable } from "@/components/Pressable";
import { goBack } from "@/lib/house-navigation";
import { useKeyboardVisible } from "@/lib/use-keyboard-visible";
import { useTheme } from "@/theme/ThemeProvider";

const HERO_ASPECT_RATIO = 512 / 311;
const HERO_ANIMATION_MS = 250;

type Hero = { image: number; heading: string };

export function HouseScreen({
  title,
  hero,
  dismissible = false,
  scrollOnlyWithKeyboard = false,
  children,
}: {
  title: string;
  hero?: Hero;
  dismissible?: boolean;
  scrollOnlyWithKeyboard?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const keyboardVisible = useKeyboardVisible();
  const collapsed = hero !== undefined && keyboardVisible;
  const collapse = useSharedValue(0);

  useEffect(() => {
    collapse.value = withTiming(collapsed ? 1 : 0, {
      duration: HERO_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [collapse, collapsed]);

  const titleStyle = useAnimatedStyle(() => ({ opacity: hero ? collapse.value : 1 }));

  const header = (
    <View
      className="flex-row items-center px-5 pb-4"
      style={{ paddingTop: insets.top + (dismissible ? 20 : 12) }}
    >
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      {/* Dismissible screens are presented as sheets, whose header scrolls away with the content. */}
      {dismissible ? null : header}

      <ScrollView
        className="flex-1"
        scrollEnabled={!scrollOnlyWithKeyboard || keyboardVisible}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        {dismissible ? header : null}
        <View className="px-6 pt-2">
          {hero ? (
            <CollapsibleHero collapse={collapse} collapsed={collapsed}>
              <Image
                source={hero.image}
                tintColor={palette.foreground}
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                style={{ aspectRatio: HERO_ASPECT_RATIO }}
                className="self-center h-36"
              />
              <Text
                accessibilityRole="header"
                className="mb-3 mt-10 font-display-medium text-3xl text-foreground"
              >
                {hero.heading}
              </Text>
            </CollapsibleHero>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
