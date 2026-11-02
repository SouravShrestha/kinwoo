import { createListStorage, useTasksScreen } from "@kinwoo/client/grocery";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import {
  countSelected,
  EMPTY_FILTER_SELECTION,
  pruneSelection,
  type FilterSelection,
} from "@kinwoo/core/filters";
import {
  assignedCountLabel,
  bulkArchiveOutcome,
  bulkClaimOutcome,
  bulkDeleteOutcome,
  DEFAULT_GROCERY_SORT,
  filterGroceryItems,
  GROCERY_SORT_OPTIONS,
  DEFAULT_GROCERY_TAB,
  parseTasksView,
  TASKS_VIEWS,
  findBoughtGroup,
  groceryEmptyCopy,
  groceryFilterGroups,
  groceryItemsByTab,
  groupBoughtItems,
  itemAssignee,
  itemBuyer,
  listIconOption,
  pendingCountLabel,
  selectionLabel,
  sortGroceryItems,
  type GroceryItem,
  type GroceryTabKey,
  type TasksView,
} from "@kinwoo/core/grocery";
import { CaretDownIcon, MoreVerticalIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Fab } from "@/components/Fab";
import { Filters } from "@/components/Filters";
import {
  ASSIGNED_SELECTION_BAR_HEIGHT,
  AssignedSelectionBar,
} from "@/components/grocery/AssignedSelectionBar";
import { BoughtGroupCard } from "@/components/grocery/BoughtGroupCard";
import { BoughtGroupSheet } from "@/components/grocery/BoughtGroupSheet";
import { EmptyItems } from "@/components/grocery/EmptyItems";
import { useLoadOlderOnScroll } from "@/components/grocery/useLoadOlderOnScroll";
import { GroceryTabView } from "@/components/grocery/GroceryTabView";
import { ItemDetailSheet } from "@/components/grocery/ItemDetailSheet";
import { EditListSheet } from "@/components/grocery/EditListSheet";
import { ListIconImage } from "@/components/grocery/ListIconImage";
import { ListSwitcherSheet } from "@/components/grocery/ListSwitcherSheet";
import { PendingItemCard } from "@/components/grocery/PendingItemCard";
import {
  pendingSelectionBarHeight,
  PendingSelectionBar,
} from "@/components/grocery/PendingSelectionBar";
import { Pressable } from "@/components/Pressable";
import { SkeletonText } from "@/components/skeleton/Skeleton";
import { ItemGridSkeleton } from "@/components/skeleton/skeletons";
import { openBatchMarkBought, openMarkBought } from "@/lib/house-navigation";
import { houseStorage } from "@/lib/house-storage";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme/ThemeProvider";

const SCREEN_PADDING = 16;
const PENDING_COLUMNS = 2;
const PENDING_CARD_GAP = 12;
const FILTERS_TOP_MARGIN = 8;

const listStorage = createListStorage(houseStorage);

function TasksScreen({ view }: { view: TasksView | null }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const {
    currentUserId,
    activeHouse,
    ready,
    houseId,
    isAdmin,
    lists,
    listsLoading,
    filters,
    setFilters,
    sortId,
    setSortId,
    tab,
    activeList: currentList,
    activeListId: activeSelectedListId,
    canManageList,
    history,
    items,
    filterGroups,
    visibleByTab,
    boughtEntries,
    loadFailed,
    filtering,
    listEmpty,
    selection,
    assignedSelection,
    selecting,
    memberById,
    confirmDelete,
    setConfirmDelete,
    deleting,
    activeGroup,
    openGroup,
    groupSheetOpen,
    setGroupSheetOpen,
    confirmArchiveGroup,
    setConfirmArchiveGroup,
    canArchiveGroup,
    handleArchiveGroup,
    handleDeleteAssignedSelection,
    handleAssignSelectionToMe,
    handleTabChange,
    handleSelectList,
  } = useTasksScreen({ view, listStorage });
  const [filtersHeight, setFiltersHeight] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<{ id: string; listId: string } | null>(null);
  const openItem = (item: GroceryItem) => setActiveItem({ id: item.id, listId: item.listId });
  const itemsLoaded = items !== undefined;
  const loadOlderProps = useLoadOlderOnScroll(history, tab === "bought");
  const refreshControl = usePullToRefresh(history.refetch);

  const handleMarkAssignedSelectionBought = () => {
    const selectedIds = assignedSelection.selectedIds;
    if (!activeSelectedListId || selectedIds.length === 0) return;
    if (selectedIds.length === 1) openMarkBought(activeSelectedListId, selectedIds[0]);
    else openBatchMarkBought(activeSelectedListId, selectedIds);
  };

  const pendingCardWidth =
    (windowWidth - SCREEN_PADDING * 2 - PENDING_CARD_GAP * (PENDING_COLUMNS - 1)) / PENDING_COLUMNS;

  if (!ready || (listsLoading && !lists)) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 12 }}>
        <View className="min-h-10 justify-center px-6 pb-3">
          <SkeletonText size="xl" className="w-32" />
        </View>
        <ItemGridSkeleton />
      </View>
    );
  }

  if (!activeHouse) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center text-base text-muted-foreground font-display-medium">
          Create or join a house to view grocery lists.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between px-6 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch grocery list"
          onPress={() => setSwitcherOpen(true)}
          className="mr-3 min-h-10 flex-1 flex-row items-center gap-3 active:opacity-70"
        >
          {currentList ? (
            <View className="size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ListIconImage label={listIconOption(currentList.icon).label} size={28} />
            </View>
          ) : null}
          <Text className="shrink font-display-medium text-xl text-foreground" numberOfLines={1}>
            {currentList?.name || "Groceries"}
          </Text>
          <CaretDownIcon size={9} color={palette.foreground} />
        </Pressable>

        {canManageList ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit this list"
            onPress={() => setManageOpen(true)}
            className="size-10 items-center justify-center active:opacity-70 -mr-3"
          >
            <MoreVerticalIcon size={3.5} color={palette.foreground} />
          </Pressable>
        ) : null}
      </View>

      <GroceryTabView
        value={tab}
        onChange={handleTabChange}
        between={
          <View
            style={{ marginTop: FILTERS_TOP_MARGIN }}
            onLayout={(event) => setFiltersHeight(event.nativeEvent.layout.height)}
          >
            <Filters
              groups={filterGroups}
              value={filters}
              onChange={setFilters}
              sort={{
                options: GROCERY_SORT_OPTIONS,
                value: sortId,
                defaultValue: DEFAULT_GROCERY_SORT,
                onChange: setSortId,
              }}
            />
          </View>
        }
        renderPage={(key) => (
          <View className="flex-1">
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
              {...(key === "bought" ? loadOlderProps : null)}
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom:
                  itemsLoaded && visibleByTab[key].length === 0
                    ? filtersHeight + FILTERS_TOP_MARGIN
                    : key === "pending" && selection.count > 0
                      ? pendingSelectionBarHeight(currentList?.visibility === "private") + 16
                      : key === "assigned" && assignedSelection.count > 0
                        ? ASSIGNED_SELECTION_BAR_HEIGHT + 16
                        : insets.bottom + 88,
              }}
            >
              {!itemsLoaded ? (
                <ItemGridSkeleton />
              ) : visibleByTab[key].length === 0 ? (
                <View className="flex-1 pb-24">
                  <EmptyItems
                    icon={filtering ? "filter" : key}
                    {...groceryEmptyCopy(key, { filtering, listEmpty })}
                  />
                </View>
              ) : key === "pending" ? (
                <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: 8 }}>
                  <View className="mb-3 min-h-8 flex-row items-center justify-between gap-3">
                    <Text
                      accessibilityLiveRegion="polite"
                      className="text-sm text-muted-foreground font-display-normal"
                    >
                      {selection.count > 0
                        ? selectionLabel(selection.count)
                        : pendingCountLabel(visibleByTab.pending.length)}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={selection.toggleAll}
                      allowDoublePress
                      hitSlop={6}
                      className="rounded-lg px-2.5 py-1.5 active:bg-muted"
                    >
                      <Text className="text-sm text-foreground font-display-medium">
                        {selection.allSelected ? "Clear" : "Select all"}
                      </Text>
                    </Pressable>
                  </View>
                  <View className="flex-row flex-wrap" style={{ gap: PENDING_CARD_GAP }}>
                    {visibleByTab.pending.map((item) => (
                      <PendingItemCard
                        key={item.id}
                        item={item}
                        width={pendingCardWidth}
                        selected={selection.isSelected(item.id)}
                        onToggleSelect={() => selection.toggle(item.id)}
                        onOpen={() => openItem(item)}
                      />
                    ))}
                  </View>
                </View>
              ) : key === "assigned" ? (
                <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: 8 }}>
                  <View className="mb-3 min-h-8 flex-row items-center justify-between gap-3">
                    <Text
                      accessibilityLiveRegion="polite"
                      className="text-sm text-muted-foreground font-display-normal"
                    >
                      {assignedSelection.count > 0
                        ? selectionLabel(assignedSelection.count)
                        : assignedCountLabel(visibleByTab.assigned.length)}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={assignedSelection.toggleAll}
                      allowDoublePress
                      hitSlop={6}
                      className="rounded-lg px-2.5 py-1.5 active:bg-muted"
                    >
                      <Text className="text-sm text-foreground font-display-medium">
                        {assignedSelection.allSelected ? "Clear" : "Select all"}
                      </Text>
                    </Pressable>
                  </View>
                  <View className="flex-row flex-wrap" style={{ gap: PENDING_CARD_GAP }}>
                    {visibleByTab.assigned.map((item) => {
                      const assignee = itemAssignee(item);
                      const member = assignee ? memberById.get(assignee.userId) : undefined;
                      return (
                        <PendingItemCard
                          key={item.id}
                          item={item}
                          width={pendingCardWidth}
                          selected={assignedSelection.isSelected(item.id)}
                          onToggleSelect={() => assignedSelection.toggle(item.id)}
                          onOpen={() => openItem(item)}
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
                  </View>
                </View>
              ) : (
                <>
                  <View
                    className="flex-row flex-wrap"
                    style={{
                      paddingHorizontal: SCREEN_PADDING,
                      paddingTop: 8,
                      gap: PENDING_CARD_GAP,
                    }}
                  >
                    {boughtEntries.map((entry) => {
                      const buyer = entry.kind === "group" ? entry.buyer : itemBuyer(entry.item);
                      const member = buyer ? memberById.get(buyer.userId) : undefined;
                      const cardBuyer = buyer
                        ? {
                            name: member?.displayName ?? buyer.name,
                            avatarUrl: member?.avatarUrl ?? null,
                          }
                        : undefined;
                      if (entry.kind === "group") {
                        return (
                          <BoughtGroupCard
                            key={`batch:${entry.batchId}`}
                            group={entry}
                            buyer={cardBuyer}
                            width={pendingCardWidth}
                            onOpen={() => openGroup(entry.batchId)}
                          />
                        );
                      }
                      return (
                        <PendingItemCard
                          key={entry.item.id}
                          item={entry.item}
                          width={pendingCardWidth}
                          assigneeVerb="bought by"
                          assignee={cardBuyer}
                          onOpen={() => openItem(entry.item)}
                        />
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>
            {key === "pending" && selection.count > 0 ? (
              <PendingSelectionBar
                houseId={houseId}
                listId={activeSelectedListId ?? ""}
                itemIds={selection.selectedIds}
                isPrivateList={currentList?.visibility === "private"}
                onAssigned={selection.clear}
                onAssignToMe={handleAssignSelectionToMe}
              />
            ) : null}
            {key === "assigned" && assignedSelection.count > 0 ? (
              <AssignedSelectionBar
                canMarkBought={assignedSelection.count > 0}
                deleting={deleting}
                onDelete={() => setConfirmDelete(true)}
                onMarkBought={handleMarkAssignedSelectionBought}
              />
            ) : null}
          </View>
        )}
      />

      {selecting ? null : activeSelectedListId ? (
        <Fab
          label="Add item to list"
          onPress={() =>
            router.push({ pathname: "/item/new", params: { listId: activeSelectedListId } })
          }
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        copy={CONFIRM_COPY.deleteItem}
        isPending={deleting}
        onConfirm={() => void handleDeleteAssignedSelection()}
        onCancel={() => setConfirmDelete(false)}
      />

      <BoughtGroupSheet
        open={groupSheetOpen}
        group={activeGroup}
        houseId={houseId}
        canArchive={canArchiveGroup}
        onClose={() => setGroupSheetOpen(false)}
        onOpenItem={(itemId, listId) => {
          setGroupSheetOpen(false);
          setActiveItem({ id: itemId, listId });
        }}
        onArchive={() => setConfirmArchiveGroup(true)}
      />

      <ConfirmDialog
        open={confirmArchiveGroup}
        copy={CONFIRM_COPY.archiveBoughtItems}
        isPending={deleting}
        onConfirm={() => void handleArchiveGroup()}
        onCancel={() => setConfirmArchiveGroup(false)}
      />

      <ItemDetailSheet
        open={activeItem !== null}
        onClose={() => setActiveItem(null)}
        houseId={houseId}
        listId={activeItem?.listId ?? ""}
        itemId={activeItem?.id ?? null}
      />

      <ListSwitcherSheet
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        lists={lists ?? []}
        selectedListId={activeSelectedListId}
        onSelect={handleSelectList}
        houseId={houseId}
      />

      <EditListSheet
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        houseId={houseId}
        list={currentList}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onRemoved={(removedId) => {
          const remaining = (lists ?? []).filter((l) => l.id !== removedId);
          const fallback = remaining.find((l) => l.isDefault) ?? remaining[0];
          if (fallback) {
            handleSelectList(fallback.id);
          }
        }}
      />
    </View>
  );
}

// The Lists tab stays mounted, so a link remounts the screen (via `at`) to apply its tab and filters.
export default function TasksRoute() {
  const { view, at } = useLocalSearchParams<{ view?: string; at?: string }>();
  const parsed = parseTasksView(view);
  return <TasksScreen key={`${parsed ?? "default"}:${at ?? ""}`} view={parsed} />;
}
