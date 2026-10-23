import {
  activityExpenseId,
  activityIconName,
  activitySettlementId,
  formatActivityDetail,
  formatActivityParts,
  formatActivityTimestamp,
  groupActivityByDay,
  type GroceryActivityEntry,
} from "@kinwoo/core/grocery";
import type { HouseMember } from "@kinwoo/core/houses";
import { ActivityKindIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { memo, useCallback, useMemo, type ReactElement } from "react";
import { SectionList, Text, View, type RefreshControlProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

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

  return (
    <View className="mr-5 mt-px">
      <View className="size-9 items-center justify-center rounded-lg bg-muted pt-0.5">
        <ActivityKindIcon
          name={activityIconName(entry)}
          size={20}
          color={colors[resolvedTheme][entry.readAt ? "mutedForeground" : "foreground"]}
        />
      </View>
      {entry.actorId ? (
        <View className="absolute -bottom-1.5 -right-1.5 rounded-full bg-background p-0.5">
          <View className={entry.readAt ? "opacity-50" : ""}>
            <Avatar
              name={actor?.displayName ?? entry.actorName}
              url={actor?.avatarUrl ?? null}
              size={ACTOR_AVATAR_SIZE}
            />
          </View>
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

  const lent = detail.tone === "lent";
  const textColor = entry.readAt
    ? "text-muted-foreground"
    : lent
      ? "text-accent"
      : "text-destructive";
  const lineColor = entry.readAt ? "bg-muted-foreground" : lent ? "bg-accent" : "bg-destructive";

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
  onOpenExpense,
  onOpenPayment,
  onOpenEntry,
}: {
  entries: GroceryActivityEntry[];
  membersById: Map<string, HouseMember>;
  currentUserId: string | null;
  onOpenExpense?: (expenseId: string | null) => void;
  onOpenPayment?: (settlementId: string | null) => void;
  onOpenEntry?: (entry: GroceryActivityEntry) => void;
}) {
  return (
    <View className="px-4">
      {entries.map((entry, index) => {
        const expenseId = activityExpenseId(entry);
        const settlementId = activitySettlementId(entry);
        const open = onOpenEntry
          ? () => onOpenEntry(entry)
          : expenseId
            ? () => onOpenExpense?.(expenseId)
            : settlementId
              ? () => onOpenPayment?.(settlementId)
              : null;
        const className = `flex-row items-start py-6 ${index > 0 ? "border-t border-border" : ""}`;
        const content = (
          <>
            <ActivityIcon entry={entry} actor={membersById.get(entry.actorId ?? "")} />
            <View className="mr-3 flex-1">
              <Text
                className={`font-display-normal text-base leading-6 ${
                  entry.readAt ? "text-muted-foreground" : "text-foreground"
                }`}
              >
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
          </>
        );

        return open ? (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityHint={
              onOpenEntry
                ? "Opens this notification"
                : expenseId
                  ? "Opens expense details"
                  : "Opens payment details"
            }
            onPress={open}
            className={className}
          >
            {content}
          </Pressable>
        ) : (
          <View key={entry.id} className={className}>
            {content}
          </View>
        );
      })}
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
  refreshControl,
  onEndReached,
  onOpenExpense,
  onOpenPayment,
  onOpenEntry,
}: {
  entries: GroceryActivityEntry[];
  members: HouseMember[];
  currentUserId: string | null;
  header: ReactElement;
  empty: ReactElement | null;
  refreshControl: ReactElement<RefreshControlProps>;
  onEndReached?: () => void;
  onOpenExpense?: (expenseId: string | null) => void;
  onOpenPayment?: (settlementId: string | null) => void;
  onOpenEntry?: (entry: GroceryActivityEntry) => void;
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
      <DayEntries
        entries={item}
        membersById={membersById}
        currentUserId={currentUserId}
        onOpenExpense={onOpenExpense}
        onOpenPayment={onOpenPayment}
        onOpenEntry={onOpenEntry}
      />
    ),
    [membersById, currentUserId, onOpenExpense, onOpenPayment, onOpenEntry],
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
      refreshControl={refreshControl}
      onEndReached={onEndReached}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
    />
  );
});
