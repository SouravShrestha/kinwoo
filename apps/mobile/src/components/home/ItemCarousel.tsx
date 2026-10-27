import { useHouseMembers } from "@kinwoo/client/houses";
import { itemAssignee, type GroceryOverviewItem, type TasksView } from "@kinwoo/core/grocery";
import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { PendingItemCard } from "@/components/grocery/PendingItemCard";
import { Pressable } from "@/components/Pressable";
import { SectionHeader } from "@/components/home/SectionHeader";
import { useTheme } from "@/theme/ThemeProvider";

const SCREEN_PADDING = 24;
const CARD_GAP = 12;
const VISIBLE_CARDS = 2.8;
const TRACK_WIDTH = 48;
const THUMB_WIDTH = 26;
const MAX_CARDS = 5;
// Height of a PendingItemCard, so the row doesn't collapse when there are no items.
const CARD_MIN_HEIGHT = 108;

export function ItemCarousel({
  title,
  viewAll,
  houseId,
  items,
  onItemPress,
}: {
  title: string;
  viewAll: { label: string; view: TasksView };
  houseId: string;
  items: GroceryOverviewItem[];
  onItemPress: (item: GroceryOverviewItem) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const { resolvedTheme } = useTheme();
  const { data: members } = useHouseMembers(houseId);
  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.userId, m])), [members]);
  const [contentWidth, setContentWidth] = useState(0);
  const scrollX = useSharedValue(0);

  const maxScroll = Math.max(contentWidth - windowWidth, 0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          [0, Math.max(maxScroll, 1)],
          [0, TRACK_WIDTH - THUMB_WIDTH],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View className="gap-4">
      <SectionHeader
        title={title}
        count={items.length}
        trailing={
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className={`h-1 overflow-hidden rounded-full bg-muted ${maxScroll > 1 ? "" : "opacity-0"}`}
            style={{ width: TRACK_WIDTH }}
          >
            <Animated.View
              className="h-full rounded-full bg-muted-foreground"
              style={[{ width: THUMB_WIDTH }, thumbStyle]}
            />
          </View>
        }
      />
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={setContentWidth}
        style={{ marginHorizontal: -SCREEN_PADDING }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, gap: CARD_GAP }}
      >
        {items.slice(0, MAX_CARDS).map((item) => {
          const assignee = itemAssignee(item);
          const member = assignee ? memberById.get(assignee.userId) : undefined;
          return (
            <PendingItemCard
              key={item.id}
              item={item}
              width={windowWidth / VISIBLE_CARDS}
              onOpen={() => onItemPress(item)}
              assignee={
                assignee
                  ? {
                      name: member?.displayName ?? assignee.name,
                      avatarUrl: member?.avatarUrl ?? null,
                    }
                  : undefined
              }
            />
          );
        })}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={viewAll.label}
          onPress={() =>
            router.push({
              pathname: "/tasks",
              params: { view: viewAll.view, at: String(Date.now()) },
            })
          }
          style={{ width: windowWidth / VISIBLE_CARDS, minHeight: CARD_MIN_HEIGHT }}
          className="justify-between gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-80"
        >
          <View className="items-end">
            <View className="size-7 items-center justify-center rounded-full border border-dialog-border">
              <ArrowRightIcon size={16} color={colors[resolvedTheme].foreground} />
            </View>
          </View>
          <Text className="font-display-medium text-sm text-foreground">{viewAll.label}</Text>
        </Pressable>
      </Animated.ScrollView>
    </View>
  );
}
