import {
  isSameLocalDay,
  monthGrid,
  monthLabel,
  startOfLocalDay,
  WEEKDAY_LABELS,
} from "@kinwoo/core/grocery";
import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { BottomSheet } from "@/components/BottomSheet";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

const COMMIT_RATIO = 0.3;
const VELOCITY_PROJECTION = 0.15;
const RUBBER_BAND = 0.25;
const SLIDE = {
  duration: 260,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

type Month = { year: number; month: number };

function shiftMonth({ year, month }: Month, delta: -1 | 1): Month {
  const next = new Date(year, month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

function MonthPane({
  view,
  value,
  today,
  active,
  onSelect,
}: {
  view: Month;
  value: Date;
  today: Date;
  active: boolean;
  onSelect: (date: Date) => void;
}) {
  const weeks = useMemo(() => {
    const days = monthGrid(view.year, view.month);
    return Array.from({ length: days.length / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7));
  }, [view]);

  return (
    <View
      className="flex-1"
      pointerEvents={active ? "auto" : "none"}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
    >
      {weeks.map((week) => (
        <View key={week[0].date.getTime()} className="h-12 flex-row">
          {week.map(({ date, inMonth }) => {
            if (!inMonth) return <View key={date.getTime()} className="flex-1" />;
            const selected = isSameLocalDay(date, value);
            const future = date.getTime() > today.getTime();
            return (
              <View key={date.getTime()} className="flex-1 items-center p-0.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${date.getDate()} ${monthLabel(date.getFullYear(), date.getMonth())}`}
                  accessibilityState={{ selected, disabled: future }}
                  disabled={future}
                  onPress={() => onSelect(date)}
                  allowDoublePress
                  className={`size-11 items-center justify-center rounded-full ${
                    selected
                      ? "bg-foreground"
                      : isSameLocalDay(date, today)
                        ? "border border-border"
                        : "active:bg-muted"
                  } ${future ? "opacity-30" : ""}`}
                >
                  <Text
                    className={`font-display-normal text-base ${
                      selected ? "text-background" : "text-foreground"
                    }`}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Calendar({
  value,
  onSelect,
  onCancel,
}: {
  value: Date;
  onSelect: (date: Date) => void;
  onCancel: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const [view, setView] = useState<Month>({ year: value.getFullYear(), month: value.getMonth() });
  const atCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth();

  const offset = useSharedValue(0);
  const width = useSharedValue(0);
  const animating = useSharedValue(false);
  const hasNext = useSharedValue(!atCurrentMonth);

  // Runs before paint so the recentred track never shows the old offset on the new month.
  useLayoutEffect(() => {
    offset.value = 0;
    animating.value = false;
    hasNext.value = !atCurrentMonth;
  }, [view, atCurrentMonth, offset, animating, hasNext]);

  const commit = useCallback((delta: -1 | 1) => {
    setView((current) => shiftMonth(current, delta));
  }, []);

  const settle = useCallback(
    (delta: -1 | 0 | 1) => {
      "worklet";
      if (delta === 0) {
        offset.set(withTiming(0, SLIDE));
        return;
      }
      animating.set(true);
      offset.set(
        withTiming(-delta * width.get(), SLIDE, (finished) => {
          if (finished) runOnJS(commit)(delta);
        }),
      );
    },
    [offset, width, animating, commit],
  );

  const go = (delta: -1 | 1) => {
    if (animating.value || (delta === 1 && !hasNext.value)) return;
    settle(delta);
  };

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-25, 25])
        .onUpdate((event) => {
          if (animating.value) return;
          const drag =
            event.translationX < 0 && !hasNext.value
              ? event.translationX * RUBBER_BAND
              : event.translationX;
          offset.set(Math.max(-width.get(), Math.min(width.get(), drag)));
        })
        .onEnd((event) => {
          if (animating.value) return;
          const projected = event.translationX + event.velocityX * VELOCITY_PROJECTION;
          const threshold = width.value * COMMIT_RATIO;
          if (projected <= -threshold && hasNext.value) settle(1);
          else if (projected >= threshold) settle(-1);
          else settle(0);
        }),
    [offset, width, animating, hasNext, settle],
  );

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value - width.value }],
  }));
  const previousLabelStyle = useAnimatedStyle(() => ({
    opacity: width.value ? Math.max(0, Math.min(1, offset.value / width.value)) : 0,
  }));
  const currentLabelStyle = useAnimatedStyle(() => ({
    opacity: width.value ? 1 - Math.min(1, Math.abs(offset.value) / width.value) : 1,
  }));
  const nextLabelStyle = useAnimatedStyle(() => ({
    opacity: width.value ? Math.max(0, Math.min(1, -offset.value / width.value)) : 0,
  }));

  const previous = shiftMonth(view, -1);
  const next = shiftMonth(view, 1);
  const labelClass = "absolute inset-0 items-center justify-center";
  const labelTextClass = "font-display-medium text-base text-foreground";

  return (
    <View>
      <View className="mb-8 mt-6 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => go(-1)}
          allowDoublePress
          hitSlop={8}
          className="size-10 items-start justify-center"
        >
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ArrowRightIcon size={22} color={palette.foreground} />
          </View>
        </Pressable>
        <View className="h-6 flex-1">
          <Animated.View className={labelClass} style={previousLabelStyle} pointerEvents="none">
            <Text className={labelTextClass}>{monthLabel(previous.year, previous.month)}</Text>
          </Animated.View>
          <Animated.View className={labelClass} style={currentLabelStyle} pointerEvents="none">
            <Text accessibilityRole="header" className={labelTextClass}>
              {monthLabel(view.year, view.month)}
            </Text>
          </Animated.View>
          <Animated.View className={labelClass} style={nextLabelStyle} pointerEvents="none">
            <Text className={labelTextClass}>
              {atCurrentMonth ? "" : monthLabel(next.year, next.month)}
            </Text>
          </Animated.View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: atCurrentMonth }}
          disabled={atCurrentMonth}
          onPress={() => go(1)}
          allowDoublePress
          hitSlop={8}
          className={`size-10 items-end justify-center ${atCurrentMonth ? "opacity-30" : ""}`}
        >
          <ArrowRightIcon size={22} color={palette.foreground} />
        </Pressable>
      </View>

      <View className="mb-1 flex-row">
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={index} className="flex-1 items-center py-1">
            <Text className="font-display-normal text-xs text-muted-foreground">{label}</Text>
          </View>
        ))}
      </View>

      <GestureDetector gesture={swipe}>
        <View
          style={{ overflow: "hidden" }}
          onLayout={(event) => {
            width.set(event.nativeEvent.layout.width);
          }}
        >
          <Animated.View style={[{ width: "300%", flexDirection: "row" }, trackStyle]}>
            <MonthPane
              view={previous}
              value={value}
              today={today}
              active={false}
              onSelect={onSelect}
            />
            <MonthPane view={view} value={value} today={today} active onSelect={onSelect} />
            {atCurrentMonth ? (
              <View className="flex-1" />
            ) : (
              <MonthPane
                view={next}
                value={value}
                today={today}
                active={false}
                onSelect={onSelect}
              />
            )}
          </Animated.View>
        </View>
      </GestureDetector>

      <View className="mt-4 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          allowDoublePress
          hitSlop={8}
          className="px-4 py-2"
        >
          <Text className="font-display-medium text-base text-foreground">Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(today)}
          allowDoublePress
          hitSlop={8}
          className="px-4 py-2"
        >
          <Text className="font-display-medium text-base text-foreground underline">Today</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DatePickerSheet({
  open,
  onClose,
  value,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  value: Date;
  onSelect: (date: Date) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label="Choose the date bought" scrollable={false}>
      {open ? (
        <Calendar
          value={value}
          onCancel={onClose}
          onSelect={(date) => {
            onSelect(date);
            onClose();
          }}
        />
      ) : null}
    </BottomSheet>
  );
}
