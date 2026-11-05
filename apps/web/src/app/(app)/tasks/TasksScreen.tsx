"use client";

import { createListStorage, useTasksScreen } from "@kinwoo/client/grocery";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import {
  assignedCountLabel,
  DEFAULT_GROCERY_TAB,
  GROCERY_SORT_OPTIONS,
  DEFAULT_GROCERY_SORT,
  groceryEmptyCopy,
  itemAssignee,
  itemBuyer,
  listIconOption,
  pendingCountLabel,
  selectionLabel,
  type GroceryTabKey,
  type TasksView,
} from "@kinwoo/core/grocery";
import { CaretDownIcon, MoreVerticalIcon } from "@kinwoo/icons";
import { ListIconImage } from "@/components/CategoryImages";
import { useState } from "react";

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
import { SkeletonText } from "@/components/skeleton/Skeleton";
import { ItemGridSkeleton } from "@/components/skeleton/skeletons";
import { batchMarkBoughtPath, markBoughtPath } from "@/lib/house-navigation";
import { houseStorage } from "@/lib/house-storage";
import { cn } from "@/lib/utils";
import { useRouter } from "@/lib/router";

// Opening a transaction leaves this page; remembering the tab lets going back land on it again.
let lastTab: GroceryTabKey = DEFAULT_GROCERY_TAB;

const listStorage = createListStorage(houseStorage);

export function TasksScreen({ view }: { view: TasksView | null }) {
  const router = useRouter();
  const {
    currentUserId,
    activeHouse,
    ready,
    houseId,
    isAdmin,
    lists,
    selectedListId,
    filters,
    setFilters,
    sortId,
    setSortId,
    tab,
    activeList,
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
  } = useTasksScreen({
    view,
    listStorage,
    defaultTab: lastTab,
    onTabChange: (key) => {
      lastTab = key;
    },
  });
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const itemsLoaded = ready && items !== undefined;
  const olderSentinel = (
    <LoadMoreSentinel
      active={history.hasOlder && !history.loadingOlder}
      onLoadMore={history.loadOlder}
    />
  );

  const handleMarkAssignedSelectionBought = () => {
    const selectedIds = assignedSelection.selectedIds;
    if (!activeList || selectedIds.length === 0) return;
    router.push(
      selectedIds.length === 1
        ? markBoughtPath(activeList.id, selectedIds[0])
        : batchMarkBoughtPath(activeList.id, selectedIds),
    );
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
        "flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col px-6 pt-[calc(0.75rem+env(safe-area-inset-top))]",
        selecting && (tab === "pending" ? "pb-36" : "pb-20"),
      )}
    >
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => setSwitcherOpen(true)}
          aria-label="Switch grocery list"
          className="mr-3 flex min-h-10 min-w-0 flex-1 items-center gap-3 text-left text-foreground transition-opacity hover:opacity-70 hover:cursor-pointer"
        >
          {activeList ? (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ListIconImage label={listIconOption(activeList.icon).label} size={28} />
            </span>
          ) : null}
          <span className="truncate font-display text-xl font-medium">
            {activeList?.name ??
              (lists || loadFailed ? "Groceries" : <SkeletonText size="xl" className="w-32" />)}
          </span>
          <CaretDownIcon size={9} className="shrink-0" />
        </button>

        {canManageList ? (
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            aria-label="Edit this list"
            className="flex size-10 items-center justify-center text-foreground transition-opacity hover:opacity-70 hover:cursor-pointer -mr-3"
          >
            <MoreVerticalIcon size={3.5} />
          </button>
        ) : null}
      </div>

      <GroceryTabView
        value={tab}
        onChange={handleTabChange}
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
            className="-mx-6 mb-3.5 mt-3.5 px-5"
          />
        }
        renderPage={(key) => {
          if (!itemsLoaded) return <ItemGridSkeleton />;
          const pageItems = visibleByTab[key];
          if (pageItems.length === 0) {
            const empty = (
              <div className="h-full pb-24">
                <EmptyItems
                  icon={filtering ? "filter" : key}
                  {...groceryEmptyCopy(key, { filtering, listEmpty })}
                />
              </div>
            );
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
              <div className="flex h-full flex-col pb-24">
                <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
                  <span
                    aria-live="polite"
                    className="font-display text-sm font-normal text-muted-foreground"
                  >
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
              </div>
            );
          }
          if (key === "assigned") {
            return (
              <div className="flex h-full flex-col pb-24">
                <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
                  <span
                    aria-live="polite"
                    className="font-display text-sm font-normal text-muted-foreground"
                  >
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
              </div>
            );
          }
          return (
            <div className="flex h-full flex-col pb-24">
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
            </div>
          );
        }}
      />

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
