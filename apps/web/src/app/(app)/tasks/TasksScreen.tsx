"use client";

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
  type GroceryTabKey,
} from "@kinwoo/core/grocery";
import { CaretDownIcon, CategoryIcon, MoreVerticalIcon, PlusCircleIcon } from "@kinwoo/icons";
import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Filters } from "@/components/Filters";
import { AssignedSelectionBar } from "@/components/grocery/AssignedSelectionBar";
import { BoughtGroupCard } from "@/components/grocery/BoughtGroupCard";
import { BoughtGroupSheet } from "@/components/grocery/BoughtGroupSheet";
import { EmptyItems } from "@/components/grocery/EmptyItems";
import { LoadMoreSentinel } from "@/components/LoadMoreSentinel";
import { GroceryTabView } from "@/components/grocery/GroceryTabView";
import { ItemDetailSheet } from "@/components/grocery/ItemDetailSheet";
import { EditListSheet } from "@/components/grocery/EditListSheet";
import { ListSwitcherSheet } from "@/components/grocery/ListSwitcherSheet";
import { PendingItemCard } from "@/components/grocery/PendingItemCard";
import { PendingSelectionBar } from "@/components/grocery/PendingSelectionBar";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";
import { batchMarkBoughtPath, markBoughtPath } from "@/lib/house-navigation";
import { houseStorage } from "@/lib/house-storage";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function TasksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const currentUserName = user?.user_metadata?.displayName ?? user?.email ?? null;

  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? "";
  const isAdmin = activeHouse?.role === "admin";

  const { data: lists } = useGroceryLists(houseId || null);

  const listStorage = useMemo(() => createListStorage(houseStorage), []);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterSelection>(EMPTY_FILTER_SELECTION);
  const [sortId, setSortId] = useState(DEFAULT_GROCERY_SORT);
  const [tab, setTab] = useState<GroceryTabKey>(DEFAULT_GROCERY_TAB);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

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
        setSelectedListId(defaultList?.id ?? null);
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

  const canManageList = !!activeList && (isAdmin || activeList.createdBy === currentUserId);

  const history = useListItemsWithHistory(houseId || null, activeList?.id ?? null);
  const items = history.items;
  const olderSentinel = (
    <LoadMoreSentinel
      active={history.hasOlder && !history.loadingOlder}
      onLoadMore={history.loadOlder}
    />
  );

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

  const itemsLoaded = ready && items !== undefined;
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

  const claimItems = useClaimItems(houseId, activeList?.id ?? "", currentUserId, currentUserName);
  const deleteItems = useDeleteItems(houseId, activeList?.id ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  useBusyWhile(deleting || history.loadingOlder);

  const handleMarkAssignedSelectionBought = () => {
    const selectedIds = assignedSelection.selectedIds;
    if (!activeList || selectedIds.length === 0) return;
    router.push(
      selectedIds.length === 1
        ? markBoughtPath(activeList.id, selectedIds[0])
        : batchMarkBoughtPath(activeList.id, selectedIds),
    );
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

  const handleSelectList = (id: string) => {
    selection.clear();
    assignedSelection.clear();
    setSelectedListId(id);
    setFilters(EMPTY_FILTER_SELECTION);
    setSortId(DEFAULT_GROCERY_SORT);
    if (houseId) {
      void listStorage.persistSelectedList(houseId, id);
    }
  };

  if (ready && !activeHouse) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-6 text-center">
        <SetupHousePrompt
          onCreate={() => router.push("/house/create")}
          onJoin={() => router.push("/house/join")}
        />
      </main>
    );
  }

  return (
    <main
      className={cn(
        "flex min-h-[calc(100dvh-4rem)] flex-col px-6 pt-6",
        selecting ? (tab === "pending" ? "pb-60" : "pb-44") : "pb-24",
      )}
    >
      <div className="flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={() => setSwitcherOpen(true)}
          aria-label="Switch grocery list"
          className="mr-3 flex min-h-10 min-w-0 flex-1 items-center gap-3 text-left text-foreground transition-opacity hover:opacity-70 hover:cursor-pointer"
        >
          {activeList ? (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <CategoryIcon name={listIconOption(activeList.icon).label} size={18} />
            </span>
          ) : null}
          <span className="truncate font-display font text-xl font-normal">
            {activeList?.name ?? "Groceries"}
          </span>
          <CaretDownIcon size={9} className="shrink-0" />
        </button>

        {canManageList ? (
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            aria-label="Edit this list"
            className="flex size-10 items-center justify-center text-foreground transition-opacity hover:opacity-70 hover:cursor-pointer -mr-4"
          >
            <MoreVerticalIcon size={3} />
          </button>
        ) : null}
      </div>

      <GroceryTabView
        value={tab}
        onChange={handleTabChange}
        fillActive={itemsLoaded && visibleByTab[tab].length === 0}
        between={
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
            className="-mx-6 px-6 mt-6 mb-2"
          />
        }
        renderPage={(key) => {
          if (!itemsLoaded) return null;
          const pageItems = visibleByTab[key];
          if (pageItems.length === 0) {
            const empty = <EmptyItems {...groceryEmptyCopy(key, { filtering, listEmpty })} />;
            if (key !== "bought") return empty;
            return (
              <div className="flex h-full flex-col">
                <div className="flex-1">{empty}</div>
                {olderSentinel}
              </div>
            );
          }
          if (key === "pending") {
            return (
              <>
                <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
                  <span aria-live="polite" className="font-display text-sm text-muted-foreground">
                    {selection.count > 0
                      ? selectionLabel(selection.count)
                      : pendingCountLabel(pageItems.length)}
                  </span>
                  <button
                    type="button"
                    onClick={selection.toggleAll}
                    className="rounded-lg px-2.5 py-1.5 font-display text-sm font-medium text-foreground transition-colors hover:cursor-pointer hover:bg-muted"
                  >
                    {selection.allSelected ? "Clear" : "Select all"}
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-3">
                  {pageItems.map((item) => (
                    <li key={item.id} className="min-w-0">
                      <PendingItemCard
                        item={item}
                        selected={selection.isSelected(item.id)}
                        onToggleSelect={() => selection.toggle(item.id)}
                        onOpen={() => setActiveItemId(item.id)}
                      />
                    </li>
                  ))}
                </ul>
                <PendingSelectionBar
                  visible={selection.count > 0}
                  houseId={houseId}
                  listId={activeList?.id ?? ""}
                  itemIds={selection.selectedIds}
                  isPrivateList={activeList?.visibility === "private"}
                  onAssigned={selection.clear}
                  onAssignToMe={handleAssignSelectionToMe}
                />
              </>
            );
          }
          if (key === "assigned") {
            return (
              <>
                <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
                  <span aria-live="polite" className="font-display text-sm text-muted-foreground">
                    {assignedSelection.count > 0
                      ? selectionLabel(assignedSelection.count)
                      : assignedCountLabel(pageItems.length)}
                  </span>
                  <button
                    type="button"
                    onClick={assignedSelection.toggleAll}
                    className="rounded-lg px-2.5 py-1.5 font-display text-sm font-medium text-foreground transition-colors hover:cursor-pointer hover:bg-muted"
                  >
                    {assignedSelection.allSelected ? "Clear" : "Select all"}
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-3">
                  {pageItems.map((item) => {
                    const assignee = itemAssignee(item);
                    const member = assignee ? memberById.get(assignee.userId) : undefined;
                    return (
                      <li key={item.id} className="min-w-0">
                        <PendingItemCard
                          item={item}
                          selected={assignedSelection.isSelected(item.id)}
                          onToggleSelect={() => assignedSelection.toggle(item.id)}
                          onOpen={() => setActiveItemId(item.id)}
                          assignee={
                            assignee
                              ? {
                                  name: member?.displayName ?? assignee.name,
                                  avatarUrl: member?.avatarUrl ?? null,
                                }
                              : undefined
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
                <AssignedSelectionBar
                  visible={assignedSelection.count > 0}
                  canMarkBought={assignedSelection.count > 0}
                  deleting={deleting}
                  onDelete={() => setConfirmDelete(true)}
                  onMarkBought={handleMarkAssignedSelectionBought}
                />
              </>
            );
          }
          return (
            <>
              <ul className="grid grid-cols-2 gap-3">
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
                      <li key={`batch:${entry.batchId}`} className="min-w-0">
                        <BoughtGroupCard
                          group={entry}
                          buyer={cardBuyer}
                          onOpen={() => openGroup(entry.batchId)}
                        />
                      </li>
                    );
                  }
                  return (
                    <li key={entry.item.id} className="min-w-0">
                      <PendingItemCard
                        item={entry.item}
                        onOpen={() => setActiveItemId(entry.item.id)}
                        assigneeVerb="bought by"
                        assignee={cardBuyer}
                      />
                    </li>
                  );
                })}
              </ul>
              {olderSentinel}
            </>
          );
        }}
      />

      <div
        hidden={selecting}
        className="fixed bottom-22.5 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pointer-events-none"
      >
        <button
          type="button"
          onClick={() =>
            router.push(
              activeList ? `/item/new?listId=${encodeURIComponent(activeList.id)}` : "/item/new",
            )
          }
          className="pointer-events-auto relative ml-auto flex size-12 items-center justify-center text-primary transition-opacity hover:opacity-90 hover:cursor-pointer"
          aria-label="Add item"
        >
          <span className="absolute inset-2.5 rounded-full bg-primary-foreground" />
          <PlusCircleIcon size={48} className="relative" />
        </button>
      </div>

      <ListSwitcherSheet
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        lists={lists ?? []}
        selectedListId={selectedListId}
        onSelect={handleSelectList}
        houseId={houseId}
      />

      <EditListSheet
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        houseId={houseId}
        list={activeList}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onRemoved={(removedId) => {
          const fallback = (lists ?? []).find((l) => l.id !== removedId);
          if (fallback) handleSelectList(fallback.id);
        }}
      />

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
        onOpenItem={(itemId) => {
          setGroupSheetOpen(false);
          setActiveItemId(itemId);
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
        open={activeItemId !== null}
        onClose={() => setActiveItemId(null)}
        houseId={houseId}
        listId={activeList?.id ?? ""}
        itemId={activeItemId}
      />
    </main>
  );
}
