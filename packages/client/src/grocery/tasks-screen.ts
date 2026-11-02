"use client";

import {
  countSelected,
  EMPTY_FILTER_SELECTION,
  pruneSelection,
  type FilterSelection,
} from "@kinwoo/core/filters";
import {
  bulkArchiveOutcome,
  bulkClaimOutcome,
  bulkDeleteOutcome,
  DEFAULT_GROCERY_SORT,
  DEFAULT_GROCERY_TAB,
  filterGroceryItems,
  findBoughtGroup,
  groceryFilterGroups,
  groceryItemsByTab,
  groupBoughtItems,
  sortGroceryItems,
  TASKS_VIEWS,
  type GroceryTabKey,
  type TasksView,
} from "@kinwoo/core/grocery";
import { useEffect, useMemo, useState } from "react";

import { useBusyWhile } from "../activity";
import { useAuth } from "../auth";
import { useActiveHouse, useHouseMembers } from "../houses";
import { toast, useToastOnLoadFailure } from "../toast";
import { useListItemsWithHistory } from "./queries";
import { useClaimItems, useDeleteItems } from "./mutations";
import { useGroceryLists } from "./queries";
import { useItemSelection } from "./selection";
import type { createListStorage } from "./storage";

type ListStorage = ReturnType<typeof createListStorage>;

/**
 * State and handlers shared by the web and mobile Tasks screens. Rendering, navigation and
 * platform storage stay with the caller.
 */
export function useTasksScreen({
  view,
  listStorage,
  defaultTab = DEFAULT_GROCERY_TAB,
  onTabChange,
}: {
  view: TasksView | null;
  listStorage: ListStorage;
  defaultTab?: GroceryTabKey;
  onTabChange?: (tab: GroceryTabKey) => void;
}) {
  const initial = view ? TASKS_VIEWS[view] : null;
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const currentUserName = user?.user_metadata?.displayName ?? user?.email ?? null;

  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? "";
  const isAdmin = activeHouse?.role === "admin";

  const {
    data: lists,
    isLoading: listsLoading,
    isError: listsError,
  } = useGroceryLists(houseId || null);

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterSelection>(
    initial?.filters ?? EMPTY_FILTER_SELECTION,
  );
  const [sortId, setSortId] = useState(DEFAULT_GROCERY_SORT);
  const [tab, setTab] = useState<GroceryTabKey>(initial?.tab ?? defaultTab);

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

  const activeList = useMemo(() => {
    const all = lists ?? [];
    return (
      all.find((l) => l.id === selectedListId) ?? all.find((l) => l.isDefault) ?? all[0] ?? null
    );
  }, [lists, selectedListId]);
  const activeListId = activeList?.id ?? null;
  const canManageList = !!activeList && (isAdmin || activeList.createdBy === currentUserId);

  const history = useListItemsWithHistory(houseId || null, activeListId);
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

  const loadFailed = (listsError && !lists) || history.loadFailed;
  useToastOnLoadFailure(loadFailed);
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

  const claimItems = useClaimItems(houseId, activeListId ?? "", currentUserId, currentUserName);
  const deleteItems = useDeleteItems(houseId, activeListId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [confirmArchiveGroup, setConfirmArchiveGroup] = useState(false);
  useBusyWhile(deleting || history.loadingOlder);

  const activeGroup = useMemo(
    () => (activeBatchId ? findBoughtGroup(items ?? [], activeBatchId) : null),
    [activeBatchId, items],
  );
  const openGroup = (batchId: string) => {
    setActiveBatchId(batchId);
    setGroupSheetOpen(true);
  };
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
    onTabChange?.(key);
    setFilters((current) =>
      pruneSelection(
        current,
        groceryFilterGroups(key, itemsByTab[key], currentUserId, items ?? []),
      ),
    );
    if (key !== "pending") selection.clear();
    if (key !== "assigned") assignedSelection.clear();
  };

  const handleSelectList = (id: string) => {
    selection.clear();
    assignedSelection.clear();
    setSelectedListId(id);
    setFilters(EMPTY_FILTER_SELECTION);
    setSortId(DEFAULT_GROCERY_SORT);
    if (houseId) void listStorage.persistSelectedList(houseId, id);
  };

  return {
    currentUserId,
    activeHouse,
    ready,
    houseId,
    isAdmin,
    lists,
    listsLoading,
    selectedListId,
    filters,
    setFilters,
    sortId,
    setSortId,
    tab,
    activeList,
    activeListId,
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
  };
}
