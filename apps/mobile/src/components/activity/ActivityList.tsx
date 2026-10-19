import {
  activityIconName,
  formatActivityDetail,
  formatActivityParts,
  formatActivityTimestamp,
  groupActivityByDay,
  type ActivityIconName,
  type GroceryActivityEntry,
} from "@kinwoo/core/grocery";
import type { HouseMember } from "@kinwoo/core/houses";
import {
  ArrowRightIcon,
  BagDollarIcon,
  CartCheckIcon,
  CartCrossIcon,
  CartMinusIcon,
  CartPlusIcon,
  EmailIcon,
  FilePlusIcon,
  FrownIcon,
  HeartIcon,
  HousePlusIcon,
  InviteIcon,
  ListSettingsIcon,
  PulseIcon,
  ShieldCheckIcon,
  TransactionIcon,
  TrashOutlineIcon,
  UserCheckIcon,
  UserCrossIcon,
  type IconProps,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { memo, useCallback, useMemo, type ComponentType, type ReactElement } from "react";
import { SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/houses/Avatar";
import { useTheme } from "@/theme/ThemeProvider";

const ICONS: Record<ActivityIconName, ComponentType<IconProps>> = {
  "cart-plus": CartPlusIcon,
  "cart-check": CartCheckIcon,
  "cart-minus": CartMinusIcon,
  "cart-cross": CartCrossIcon,
  "bag-dollar": BagDollarIcon,
  transaction: TransactionIcon,
  "user-check": UserCheckIcon,
  "user-cross": UserCrossIcon,
  heart: HeartIcon,
  frown: FrownIcon,
  "file-plus": FilePlusIcon,
  "list-settings": ListSettingsIcon,
  trash: TrashOutlineIcon,
  "house-plus": HousePlusIcon,
  "shield-check": ShieldCheckIcon,
  invite: InviteIcon,
  email: EmailIcon,
  "arrow-right": ArrowRightIcon,
  pulse: PulseIcon,
};

const END_REACHED_THRESHOLD = 0.5;
const ACTOR_AVATAR_SIZE = 16;

type DaySection = {
  key: string;
  title: string;
  data: GroceryActivityEntry[][];
};

function ActivityIcon({
  entry,
  actor,
}: {
  entry: GroceryActivityEntry;
  actor: HouseMember | undefined;
}) {
  const { resolvedTheme } = useTheme();
  const Icon = ICONS[activityIconName(entry)];

  return (
    <View className="mr-5 mt-px">
      <View className="size-9 items-center justify-center rounded-lg bg-muted pt-0.5">
        <Icon size={20} color={colors[resolvedTheme].foreground} />
      </View>
      {entry.actorId ? (
        <View className="absolute -bottom-1.5 -right-1.5 rounded-full bg-background p-0.5">
          <Avatar
            name={actor?.displayName ?? entry.actorName}
            url={actor?.avatarUrl ?? null}
            size={ACTOR_AVATAR_SIZE}
          />
        </View>
      ) : null}
    </View>
  );
}

function ActivityDetail({
  entry,
  currentUserId,
}: {
  entry: GroceryActivityEntry;
  currentUserId: string | null;
}) {
  const detail = formatActivityDetail(entry, currentUserId);
  if (!detail) return null;

  const textColor = detail.tone === "lent" ? "text-accent" : "text-destructive";
  const lineColor = detail.tone === "lent" ? "bg-accent" : "bg-destructive";

  return (
    <View
      accessible
      accessibilityLabel={detail.struck ? `${detail.text}, deleted` : detail.text}
      className="mt-1 self-start"
    >
      <Text className={`font-display-normal text-sm leading-5 ${textColor}`}>{detail.text}</Text>
      {detail.struck ? (
        <View
          pointerEvents="none"
          className={`absolute -left-0.5 -right-0.5 top-1/2 h-px ${lineColor}`}
        />
      ) : null}
    </View>
  );
}

function DayEntries({
  entries,
  membersById,
  currentUserId,
}: {
  entries: GroceryActivityEntry[];
  membersById: Map<string, HouseMember>;
  currentUserId: string | null;
}) {
  return (
    <View className="px-4">
      {entries.map((entry, index) => (
        <View
          key={entry.id}
          className={`flex-row items-start py-6 ${index > 0 ? "border-t border-border" : ""}`}
        >
          <ActivityIcon entry={entry} actor={membersById.get(entry.actorId ?? "")} />
          <View className="mr-3 flex-1">
            <Text className="font-display-normal text-base leading-6 text-foreground">
              {formatActivityParts(entry, currentUserId).map((part, index) => (
                <Text
                  key={index}
                  className={part.emphasis ? "font-display-medium-italic" : "font-display-normal"}
                >
                  {part.text}
                </Text>
              ))}
            </Text>
            <ActivityDetail entry={entry} currentUserId={currentUserId} />
            <Text className="mt-3 font-display-normal text-xs text-muted-foreground">
              {formatActivityTimestamp(entry.createdAt)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const keyExtractor = (group: GroceryActivityEntry[], index: number) =>
  group[0]?.id ?? String(index);

const renderSectionHeader = ({ section }: { section: DaySection }) => (
  <View className="bg-background px-4 py-2">
    <Text className="font-display-medium text-sm text-foreground">{section.title}</Text>
  </View>
);

export const ActivityList = memo(function ActivityList({
  entries,
  members,
  currentUserId,
  header,
  empty,
  onEndReached,
}: {
  entries: GroceryActivityEntry[];
  members: HouseMember[];
  currentUserId: string | null;
  header: ReactElement;
  empty: ReactElement | null;
  onEndReached: () => void;
}) {
  const insets = useSafeAreaInsets();
  const membersById = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  const sections = useMemo<DaySection[]>(
    () =>
      groupActivityByDay(entries).map((group) => ({
        key: group.key,
        title: group.label,
        data: [group.entries],
      })),
    [entries],
  );

  const renderItem = useCallback(
    ({ item }: { item: GroceryActivityEntry[] }) => (
      <DayEntries entries={item} membersById={membersById} currentUserId={currentUserId} />
    ),
    [membersById, currentUserId],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      extraData={membersById}
      stickySectionHeadersEnabled
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      onEndReached={onEndReached}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
    />
  );
});
