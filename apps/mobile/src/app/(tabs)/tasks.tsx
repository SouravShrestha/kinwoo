import { useAuth } from "@kinwoo/client/auth";
import { useBusyWhile } from "@kinwoo/client/activity";
import {
  createListStorage,
  useClaimItems,
  useDeleteItems,
  useListItemsWithHistory,
  useGroceryLists,
  useItemSelection,
} from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
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
} from "@kinwoo/core/grocery";
import { CaretDownIcon, CategoryIcon, MoreVerticalIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
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
import { ListSwitcherSheet } from "@/components/grocery/ListSwitcherSheet";
import { PendingItemCard } from "@/components/grocery/PendingItemCard";
import {
  pendingSelectionBarHeight,
  PendingSelectionBar,
} from "@/components/grocery/PendingSelectionBar";
import { Pressable } from "@/components/Pressable";
import { openBatchMarkBought, openMarkBought } from "@/lib/house-navigation";
import { houseStorage } from "@/lib/house-storage";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme/ThemeProvider";

const SCREEN_PADDING = 16;
const PENDING_COLUMNS = 2;
const PENDING_CARD_GAP = 12;
const FILTERS_TOP_MARGIN = 8;

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const currentUserName = user?.user_metadata?.displayName ?? user?.email ?? null;

  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? "";

  const { data: lists, isLoading: listsLoading } = useGroceryLists(houseId || null);

  const listStorage = useMemo(() => createListStorage(houseStorage), []);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterSelection>(EMPTY_FILTER_SELECTION);
  const [sortId, setSortId] = useState(DEFAULT_GROCERY_SORT);
  const [tab, setTab] = useState<GroceryTabKey>(DEFAULT_GROCERY_TAB);
  const [filtersHeight, setFiltersHeight] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<{ id: string; listId: string } | null>(null);
  const openItem = (item: GroceryItem) => setActiveItem({ id: item.id, listId: item.listId });

  // Restore/persist selected list
  useEffect(() => {
    if (!houseId || !lists || lists.length === 0) return;

    let active = true;
    void listStorage.loadSelectedList(houseId).then((storedId) => {
      if (!active) return;
      if (storedId && lists.some((l) => l.id === storedId)) {
        setSelectedListId(storedId);
      } else {
        const defaultList = lists.find((l) => l.isDefault) ?? lists[0];
        if (defaultList) {
          setSelectedListId(defaultList.id);
          void listStorage.persistSelectedList(houseId, defaultList.id);
        }
      }
    });

    return () => {
      active = false;
    };
  }, [houseId, lists, listStorage]);

  const defaultList = useMemo(() => lists?.find((l) => l.isDefault) ?? lists?.[0] ?? null, [lists]);

  const currentList = useMemo(() => {
    if (!selectedListId) return defaultList;
    const found = lists?.find((l) => l.id === selectedListId);
    return found ?? defaultList;
  }, [lists, selectedListId, defaultList]);

  const activeSelectedListId = currentList?.id ?? null;
  const isAdmin = activeHouse?.role === "admin";
  const canManageList = !!currentList && (isAdmin || currentList.createdBy === currentUserId);

  const history = useListItemsWithHistory(houseId || null, activeSelectedListId);
  const items = history.items;

  const itemsByTab = useMemo(() => groceryItemsByTab(items ?? []), [items]);

  const filterGroups = useMemo(
    () => groceryFilterGroups(tab, itemsByTab[tab], currentUserId, items ?? []),
    [itemsByTab, tab, currentUserId, items],
  );

  const visibleByTab = useMemo(
    () =>
      groceryItemsByTab(
        sortGroceryItems(filterGroceryItems(items ?? [], filters, currentUserId), sortId),
      ),
    [items, filters, currentUserId, sortId],
  );

  const boughtEntries = useMemo(
    () => groupBoughtItems(visibleByTab.bought, items ?? []),
    [visibleByTab, items],
  );

  const itemsLoaded = items !== undefined;
  const filtering = countSelected(filters) > 0;
  const listEmpty = (items ?? []).length === 0;

  const pendingIds = useMemo(() => visibleByTab.pending.map((item) => item.id), [visibleByTab]);
  const selection = useItemSelection(pendingIds);
  const assignedIds = useMemo(() => visibleByTab.assigned.map((item) => item.id), [visibleByTab]);
  const assignedSelection = useItemSelection(assignedIds);
  const selecting =
    (selection.count > 0 && tab === "pending") ||
    (assignedSelection.count > 0 && tab === "assigned");

  const { data: members } = useHouseMembers(houseId || null);
  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.userId, m])), [members]);

  const claimItems = useClaimItems(
    houseId,
    activeSelectedListId ?? "",
    currentUserId,
    currentUserName,
  );
  const deleteItems = useDeleteItems(houseId, activeSelectedListId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  useBusyWhile(deleting || history.loadingOlder);
  const loadOlderProps = useLoadOlderOnScroll(history, tab === "bought");
  const refreshControl = usePullToRefresh(history.refetch);

  const handleMarkAssignedSelectionBought = () => {
    const selectedIds = assignedSelection.selectedIds;
    if (!activeSelectedListId || selectedIds.length === 0) return;
    if (selectedIds.length === 1) openMarkBought(activeSelectedListId, selectedIds[0]);
    else openBatchMarkBought(activeSelectedListId, selectedIds);
  };

  const activeGroup = useMemo(
    () => (activeBatchId ? findBoughtGroup(items ?? [], activeBatchId) : null),
    [activeBatchId, items],
  );
  const openGroup = (batchId: string) => {
    setActiveBatchId(batchId);
    setGroupSheetOpen(true);
  };

  const [confirmArchiveGroup, setConfirmArchiveGroup] = useState(false);
  const canArchiveGroup =
    !!activeGroup &&
    (isAdmin || activeGroup.items.every((item) => item.createdBy === currentUserId));

  const handleArchiveGroup = async () => {
    const itemIds = activeGroup?.items.map((item) => item.id) ?? [];
    if (itemIds.length === 0) return;
    setDeleting(true);
    // Failures count as nothing archived, matching bulkArchiveOutcome's error case.
    const archived = await deleteItems.mutateAsync(itemIds).then(
      (result) => result.deleted,
      () => 0,
    );
    setDeleting(false);
    setConfirmArchiveGroup(false);
    const outcome = bulkArchiveOutcome(archived, itemIds.length);
    if (outcome.tone === "error") toast.error(outcome.message);
    else {
      toast.success(outcome.message);
      setGroupSheetOpen(false);
    }
  };

  const handleDeleteAssignedSelection = async () => {
    const itemIds = assignedSelection.selectedIds;
    if (itemIds.length === 0) return;
    setDeleting(true);
    // Failures count as nothing deleted, matching bulkDeleteOutcome's error case.
    const deleted = await deleteItems.mutateAsync(itemIds).then(
      (result) => result.deleted,
      () => 0,
    );
    setDeleting(false);
    setConfirmDelete(false);
    const outcome = bulkDeleteOutcome(deleted, itemIds.length);
    if (outcome.tone === "error") toast.error(outcome.message);
    else toast.success(outcome.message);
    assignedSelection.clear();
  };

  const handleAssignSelectionToMe = () => {
    const itemIds = selection.selectedIds;
    if (itemIds.length === 0) return;
    claimItems.mutate(itemIds, {
      onSuccess: (result) => {
        const outcome = bulkClaimOutcome(result);
        if (outcome.tone === "error") toast.error(outcome.message);
        else toast.success(outcome.message);
      },
      onError: () => toast.error("Couldn't assign those items to you. Try again."),
    });
    selection.clear();
  };

  const handleTabChange = (key: GroceryTabKey) => {
    setTab(key);
    setFilters((current) =>
      pruneSelection(
        current,
        groceryFilterGroups(key, itemsByTab[key], currentUserId, items ?? []),
      ),
    );
    if (key !== "pending") selection.clear();
    if (key !== "assigned") assignedSelection.clear();
  };

  const handleSelectList = (listId: string) => {
    selection.clear();
    assignedSelection.clear();
    setSelectedListId(listId);
    setFilters(EMPTY_FILTER_SELECTION);
    setSortId(DEFAULT_GROCERY_SORT);
    if (houseId) {
      void listStorage.persistSelectedList(houseId, listId);
    }
  };

  const pendingCardWidth =
    (windowWidth - SCREEN_PADDING * 2 - PENDING_CARD_GAP * (PENDING_COLUMNS - 1)) / PENDING_COLUMNS;

  if (!ready || (listsLoading && !lists)) {
    return <View className="flex-1 bg-background" />;
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
              <CategoryIcon
                name={listIconOption(currentList.icon).label}
                size={18}
                color={palette.foreground}
              />
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
              {!itemsLoaded ? null : visibleByTab[key].length === 0 ? (
                <>
                  <EmptyItems {...groceryEmptyCopy(key, { filtering, listEmpty })} />
                </>
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
