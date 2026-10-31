import { useExpenseTotals } from "@kinwoo/client/expenses";
import { LOAD_FAILED_MESSAGE } from "@kinwoo/core/app";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import {
  currentMonthKey,
  shiftMonth,
  totalsMonthLabel,
  totalsView,
  totalsChartY,
  totalsSeriesPath,
  type TotalsPoint,
  type TotalsTick,
} from "@kinwoo/core/expenses";
import { formatPaise } from "@kinwoo/core/grocery";
import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useState } from "react";
import { Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from "react-native-svg";

import { PeriodFilter } from "@/components/expenses/PeriodFilter";
import { Pressable } from "@/components/Pressable";
import { TotalsSkeleton } from "@/components/skeleton/skeletons";
import { SwipeDownScreen } from "@/components/SwipeDownScreen";
import { goBack } from "@/lib/house-navigation";
import { useSwipeDownToDismiss } from "@/lib/use-swipe-down-to-dismiss";
import { useTheme } from "@/theme/ThemeProvider";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 220;
const AXIS_WIDTH = 40;

type Palette = (typeof colors)[keyof typeof colors];

function TotalsChart({
  points,
  yTicks,
  palette,
}: {
  points: TotalsPoint[];
  yTicks: TotalsTick[];
  palette: Palette;
}) {
  const total = totalsSeriesPath(
    points.map((point) => point.totalRatio),
    CHART_WIDTH,
    CHART_HEIGHT,
  );
  const share = totalsSeriesPath(
    points.map((point) => point.shareRatio),
    CHART_WIDTH,
    CHART_HEIGHT,
  );

  return (
    <View className="mt-10 px-6">
      <View style={{ marginHorizontal: AXIS_WIDTH, aspectRatio: CHART_WIDTH / CHART_HEIGHT }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
          <Defs>
            <LinearGradient id="totalsFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={palette.accent} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {yTicks.map((tick) => {
            const y = totalsChartY(tick.ratio, CHART_HEIGHT);
            return (
              <Line
                key={tick.paise}
                x1={0}
                x2={CHART_WIDTH}
                y1={y}
                y2={y}
                stroke={palette.border}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            );
          })}
          <Path d={total.area} fill="url(#totalsFade)" />
          {[
            { path: total, color: palette.accent },
            { path: share, color: palette.foreground },
          ].map(({ path, color }) => (
            <G key={color}>
              <Path
                d={path.line}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {path.points.map((point, index) =>
                point ? (
                  <Circle
                    key={points[index]?.month}
                    cx={point.x}
                    cy={point.y}
                    r={points[index]?.selected ? 6 : 4}
                    fill={color}
                    stroke={palette.background}
                    strokeWidth={2}
                  />
                ) : null,
              )}
            </G>
          ))}
        </Svg>
        {yTicks.map((tick) => (
          <Text
            key={tick.paise}
            className="absolute text-right font-display-normal text-xs text-muted-foreground"
            style={{
              left: -AXIS_WIDTH,
              width: AXIS_WIDTH - 8,
              top: `${(totalsChartY(tick.ratio, CHART_HEIGHT) / CHART_HEIGHT) * 100}%`,
              marginTop: -8,
              lineHeight: 16,
            }}
          >
            {tick.label}
          </Text>
        ))}
      </View>
      <View className="mt-2 flex-row" style={{ marginHorizontal: AXIS_WIDTH }}>
        {points.map((point) => (
          <Text
            key={point.month}
            className={`flex-1 text-center font-display-medium text-sm tracking-wide ${
              point.selected ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <View className="flex-1 items-center">
      <Text className="font-display-medium text-base text-foreground">{label}</Text>
      <Text className={`mt-2 font-display-normal text-2xl ${valueClassName}`}>{value}</Text>
    </View>
  );
}

export function TotalsScreen({ houseId }: { houseId: string }) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { data: months, isError } = useExpenseTotals(houseId);
  const { pan, scrollGesture, onScroll, sheetStyle } = useSwipeDownToDismiss(goBack);
  const [current] = useState(currentMonthKey);
  const [month, setMonth] = useState(current);
  const [allTime, setAllTime] = useState(false);
  const view = totalsView(months ?? [], allTime ? null : month, current);

  return (
    <SwipeDownScreen pan={pan} sheetStyle={sheetStyle}>
      <GestureDetector gesture={scrollGesture}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          // Overscroll at the top would fight the pull-down; the sheet itself gives the feedback.
          bounces={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <View className="px-6" style={{ paddingTop: insets.top + 20 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={goBack}
              hitSlop={12}
              className="size-10 items-start justify-center"
            >
              <View style={{ transform: [{ rotate: "90deg" }] }}>
                <ArrowRightIcon size={28} color={palette.foreground} />
              </View>
            </Pressable>
          </View>

          <View className="mt-4">
            <PeriodFilter
              label={totalsMonthLabel(month)}
              allTime={allTime}
              canGoPrevious={view.canGoPrevious}
              canGoNext={view.canGoNext}
              onToggleAllTime={() => setAllTime((value) => !value)}
              onPrevious={() => setMonth((value) => shiftMonth(value, -1))}
              onNext={() => setMonth((value) => shiftMonth(value, 1))}
            />
          </View>

          {months ? (
            <>
              {view.points.length > 0 ? (
                <TotalsChart
                  key={month}
                  points={view.points}
                  yTicks={view.yTicks}
                  palette={palette}
                />
              ) : null}
              <View className="mt-16 px-6">
                <Text className="text-center font-display-normal text-base text-muted-foreground">
                  {`Your share is ${view.sharePercent}% of the group's total spending`}
                </Text>
                <View className="mt-6 flex-row gap-4">
                  <Stat
                    label="Total spent"
                    value={formatPaise(view.totalPaise)}
                    valueClassName="text-accent"
                  />
                  <Stat
                    label="Your share"
                    value={formatPaise(view.sharePaise)}
                    valueClassName="text-foreground"
                  />
                </View>
              </View>
            </>
          ) : isError ? (
            <Text className="pt-16 text-center font-display-normal text-base text-muted-foreground">
              {LOAD_FAILED_MESSAGE}
            </Text>
          ) : (
            <TotalsSkeleton />
          )}
        </Animated.ScrollView>
      </GestureDetector>
    </SwipeDownScreen>
  );
}
