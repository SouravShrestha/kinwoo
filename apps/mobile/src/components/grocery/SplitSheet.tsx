import type { ExpenseSplitForm, PayerMember } from "@kinwoo/client/grocery";
import {
  formatPaise,
  SPLIT_METHOD_TITLES,
  SPLIT_METHODS,
  type SplitMethod,
} from "@kinwoo/core/grocery";
import { ArrowRightIcon, CheckCircleIcon, CheckIcon, SharesIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useEffect, useState } from "react";
import { Keyboard, Text, useWindowDimensions, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet, SHEET_KEYBOARD_GAP, SheetTextInput } from "@/components/BottomSheet";
import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { useKeyboardHeight } from "@/lib/use-keyboard-visible";
import { useTheme } from "@/theme/ThemeProvider";

const LABEL = "How was it split?";
const LIST_GAP = 20;
const SUMMARY_GAP = 16;
const SUMMARY_GAP_TYPING = 8;
// gorhom's handle row plus BottomSheet's top padding.
const SHEET_TOP = 38;
const SCREEN_TOP_GAP = 24;
const MIN_LIST_HEIGHT = 128;
const TAB_GAP = 8;
const TAB_TIMING = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

const TAB_TEXT: Record<Exclude<SplitMethod, "shares">, string> = {
  equal: "=",
  exact: "1.23",
  percent: "%",
};

const INPUT_AFFIX: Record<Exclude<SplitMethod, "equal">, { prefix?: string; suffix?: string }> = {
  exact: { prefix: "₹" },
  percent: { suffix: "%" },
  shares: {},
};

function memberLabel(member: PayerMember): string {
  return member.isYou ? "You" : member.name;
}

function Checkbox({ checked, checkColor }: { checked: boolean; checkColor: string }) {
  return (
    <View
      className={`size-5 items-center justify-center rounded-md ${
        checked ? "bg-foreground" : "border border-border"
      }`}
    >
      {checked ? <CheckIcon size={10} color={checkColor} /> : null}
    </View>
  );
}

export function SplitSheet({
  open,
  onClose,
  split,
}: {
  open: boolean;
  onClose: () => void;
  split: ExpenseSplitForm;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { method } = split;
  const showsShare = method === "percent" || method === "shares";
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const summaryGap = keyboardHeight > 0 ? SUMMARY_GAP_TYPING : SUMMARY_GAP;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [summaryHeight, setSummaryHeight] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  // The list takes whatever the screen has left around the header and summary, and only
  // scrolls once the members no longer fit.
  const listMaxHeight = Math.max(
    MIN_LIST_HEIGHT,
    windowHeight -
      insets.top -
      SCREEN_TOP_GAP -
      keyboardHeight -
      SHEET_TOP -
      headerHeight -
      LIST_GAP -
      summaryGap -
      summaryHeight -
      (keyboardHeight > 0 ? SHEET_KEYBOARD_GAP : Math.max(insets.bottom, 32)),
  );
  const scrolls = listHeight > listMaxHeight;

  const [tabsWidth, setTabsWidth] = useState(0);
  const tabWidth = (tabsWidth - TAB_GAP * (SPLIT_METHODS.length - 1)) / SPLIT_METHODS.length;
  const activeIndex = SPLIT_METHODS.indexOf(method);
  const highlightX = useSharedValue(0);
  useEffect(() => {
    highlightX.value = withTiming(activeIndex * (tabWidth + TAB_GAP), TAB_TIMING);
  }, [activeIndex, tabWidth, highlightX]);
  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: highlightX.value }],
  }));

  const cancel = () => {
    Keyboard.dismiss();
    split.discard();
    onClose();
  };
  const done = () => {
    if (!split.commit()) return;
    Keyboard.dismiss();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={cancel} label={LABEL} scrollable={false}>
      <View onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard changes"
            onPress={cancel}
            hitSlop={12}
            className="size-10 items-start justify-center active:opacity-60"
          >
            <View style={{ transform: [{ rotate: "90deg" }] }}>
              <ArrowRightIcon size={28} color={palette.foreground} />
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save split"
            accessibilityState={{ disabled: !split.canCommit }}
            disabled={!split.canCommit}
            onPress={done}
            allowDoublePress
            hitSlop={12}
            className={`size-10 items-end justify-center active:opacity-60 ${
              split.canCommit ? "" : "opacity-40"
            }`}
          >
            <CheckCircleIcon size={26} color={palette.foreground} />
          </Pressable>
        </View>
        <Text
          accessibilityRole="header"
          className="mt-2 font-display-medium text-xl text-foreground"
        >
          {SPLIT_METHOD_TITLES[method]}
        </Text>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onLayout={(event) => setTabsWidth(event.nativeEvent.layout.width)}
          className="mt-5 flex-row"
          style={{ gap: TAB_GAP }}
        >
          {SPLIT_METHODS.map((tab) => (
            <View key={tab} className="h-9 flex-1 rounded-xl bg-muted" />
          ))}
          {tabsWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              className="absolute left-0 top-0 h-9 rounded-xl bg-foreground"
              style={[{ width: tabWidth }, highlightStyle]}
            />
          ) : null}
        </View>
        <View accessibilityRole="tablist" className="-mt-9 flex-row" style={{ gap: TAB_GAP }}>
          {SPLIT_METHODS.map((tab) => {
            const active = tab === method;
            const tint = active ? palette.background : palette.foreground;
            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityLabel={SPLIT_METHOD_TITLES[tab]}
                accessibilityState={{ selected: active }}
                onPress={() => split.setMethod(tab)}
                allowDoublePress
                className="h-9 flex-1 items-center justify-center rounded-xl active:opacity-80"
              >
                {tab === "shares" ? (
                  <SharesIcon size={15} color={tint} />
                ) : (
                  <Text
                    className={`font-display-medium text-sm ${
                      active ? "text-background" : "text-foreground"
                    }`}
                  >
                    {TAB_TEXT[tab]}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        scrollEnabled={scrolls}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={scrolls}
        onContentSizeChange={(_, height) => setListHeight(height)}
        style={{ maxHeight: listMaxHeight, marginTop: LIST_GAP }}
      >
        {split.members.map((member) => {
          const label = memberLabel(member);
          const name = (
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="font-display-normal text-base text-foreground">
                {label}
              </Text>
              {showsShare ? (
                <Text
                  numberOfLines={1}
                  className="font-display-normal text-sm text-muted-foreground"
                >
                  {formatPaise(split.shareOf(member.userId))}
                </Text>
              ) : null}
            </View>
          );

          if (method === "equal") {
            const included = split.isIncluded(member.userId);
            return (
              <Pressable
                key={member.userId}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: included }}
                accessibilityLabel={label}
                onPress={() => split.toggle(member.userId)}
                allowDoublePress
                className="min-h-16 flex-row items-center gap-4 py-2 active:opacity-70"
              >
                <Avatar name={member.name} url={member.avatarUrl} size={36} />
                {name}
                <Checkbox checked={included} checkColor={palette.background} />
              </Pressable>
            );
          }

          const { prefix, suffix } = INPUT_AFFIX[method];
          return (
            <View key={member.userId} className="min-h-16 flex-row items-center gap-4 py-2">
              <Avatar name={member.name} url={member.avatarUrl} size={36} />
              {name}
              <View className="h-11 w-28 flex-row items-center rounded-xl bg-muted px-3">
                {prefix ? (
                  <Text className="font-display-normal text-base text-muted-foreground">
                    {prefix}
                  </Text>
                ) : null}
                <SheetTextInput
                  accessibilityLabel={`${SPLIT_METHOD_TITLES[method]} for ${label}`}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={palette.mutedForeground}
                  value={split.valueText(member.userId)}
                  onChangeText={(text: string) => split.setValue(member.userId, text)}
                  className="min-w-0 flex-1 px-1 text-right font-display-normal text-foreground"
                  style={{ fontSize: 16, paddingVertical: 0 }}
                />
                {suffix ? (
                  <Text className="font-display-normal text-base text-muted-foreground">
                    {suffix}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View
        onLayout={(event) => setSummaryHeight(event.nativeEvent.layout.height)}
        className={`flex-row items-center gap-4 border-t border-border ${
          keyboardHeight > 0 ? "pt-2" : "pt-4"
        }`}
        style={{ marginTop: summaryGap }}
      >
        <View accessibilityLiveRegion="polite" className="flex-1 items-center">
          <Text className="text-center font-display-medium text-base text-foreground">
            {split.summary.primary}
          </Text>
          {split.summary.secondary ? (
            <Text
              className={`text-center font-display-normal text-sm ${
                split.summary.error ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {split.summary.secondary}
            </Text>
          ) : null}
        </View>
        {method === "equal" ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: split.allIncluded }}
            accessibilityLabel="All"
            onPress={split.toggleAll}
            allowDoublePress
            className="flex-row items-center gap-3 self-stretch border-l border-border pl-4 active:opacity-70"
          >
            <Text className="font-display-normal text-sm text-foreground">All</Text>
            <Checkbox checked={split.allIncluded} checkColor={palette.background} />
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}
