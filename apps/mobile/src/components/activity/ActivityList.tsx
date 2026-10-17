import {
  activityIconName,
  formatActivityParts,
  formatRelativeTime,
  groupActivityByDay,
  type ActivityIconName,
  type GroceryActivityEntry,
} from "@kinwoo/core/grocery";
import {
  BagDollarIcon,
  CartCheckIcon,
  CartCrossIcon,
  CartMinusIcon,
  CartPlusIcon,
  FilePlusIcon,
  FrownIcon,
  HeartIcon,
  HousePlusIcon,
  ListSettingsIcon,
  PulseIcon,
  TrashOutlineIcon,
  UserCheckIcon,
  UserCrossIcon,
  type IconProps,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useMemo, type ComponentType, type ReactElement } from "react";
import { SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/ThemeProvider";

const ICONS: Record<ActivityIconName, ComponentType<IconProps>> = {
  "cart-plus": CartPlusIcon,
  "cart-check": CartCheckIcon,
  "cart-minus": CartMinusIcon,
  "cart-cross": CartCrossIcon,
  "bag-dollar": BagDollarIcon,
  "user-check": UserCheckIcon,
  "user-cross": UserCrossIcon,
  heart: HeartIcon,
  frown: FrownIcon,
  "file-plus": FilePlusIcon,
  "list-settings": ListSettingsIcon,
  trash: TrashOutlineIcon,
  "house-plus": HousePlusIcon,
  pulse: PulseIcon,
};

const END_REACHED_THRESHOLD = 0.5;

type DaySection = {
  key: string;
  title: string;
  data: GroceryActivityEntry[][];
};

function ActivityIcon({ entry }: { entry: GroceryActivityEntry }) {
  const { resolvedTheme } = useTheme();
  const Icon = ICONS[activityIconName(entry)];

  return (
    <View className="mr-5 mt-px size-9 items-center justify-center rounded-lg bg-muted pt-0.5">
      <Icon size={20} color={colors[resolvedTheme].foreground} />
    </View>
  );
}

function DayEntries({
  entries,
  currentUserId,
}: {
  entries: GroceryActivityEntry[];
  currentUserId: string | null;
}) {
  return (
    <View className="px-6">
      {entries.map((entry, index) => (
        <View
          key={entry.id}
          className={`flex-row items-start py-6 ${index > 0 ? "border-t border-border" : ""}`}
        >
          <ActivityIcon entry={entry} />
          <Text className="mr-3 flex-1 font-display-normal text-base leading-6 text-foreground">
            {formatActivityParts(entry, currentUserId).map((part, index) => (
              <Text
                key={index}
                className={part.emphasis ? "font-display-medium-italic" : "font-display-normal"}
              >
                {part.text}
              </Text>
            ))}
          </Text>
          <Text className="pt-1 font-display-normal text-xs text-muted-foreground">
            {formatRelativeTime(entry.createdAt)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ActivityList({
  entries,
  currentUserId,
  header,
  empty,
  onEndReached,
}: {
  entries: GroceryActivityEntry[];
  currentUserId: string | null;
  header: ReactElement;
  empty: ReactElement | null;
  onEndReached: () => void;
}) {
  const insets = useSafeAreaInsets();

  const sections = useMemo<DaySection[]>(
    () =>
      groupActivityByDay(entries).map((group) => ({
        key: group.key,
        title: group.label,
        data: [group.entries],
      })),
    [entries],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(group, index) => group[0]?.id ?? String(index)}
      renderItem={({ item }) => <DayEntries entries={item} currentUserId={currentUserId} />}
      renderSectionHeader={({ section }) => (
        <View className="bg-background px-6 py-2">
          <Text className="font-display-medium text-sm text-foreground">{section.title}</Text>
        </View>
      )}
      stickySectionHeadersEnabled
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      onEndReached={onEndReached}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
    />
  );
}
