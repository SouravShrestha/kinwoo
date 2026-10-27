"use client";

import { useAuth } from "@kinwoo/client/auth";
import {
  useDeleteItem,
  useGroceryItem,
  useEditItemForm,
  useGroceryLists,
} from "@kinwoo/client/grocery";
import { useActiveHouse } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ItemDetailSkeleton } from "@/components/skeleton/skeletons";
import { markBoughtPath } from "@/lib/house-navigation";

import { AssignedItemDetails } from "./AssignedItemDetails";
import { BoughtItemDetails } from "./BoughtItemDetails";
import { PendingItemDetails } from "./PendingItemDetails";

export function ItemDetailSheet({
  open,
  onClose,
  houseId,
  listId,
  itemId,
}: {
  open: boolean;
  onClose: () => void;
  houseId: string;
  listId: string;
  itemId: string | null;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { activeHouse } = useActiveHouse();
  const isAdmin = activeHouse?.role === "admin";
  const currentUserId = user?.id ?? "";
  const currentUserName = user?.user_metadata?.displayName ?? user?.email ?? null;

  const { data: item, isPending: itemPending } = useGroceryItem(houseId, listId, itemId);
  const { data: lists } = useGroceryLists(houseId || null);
  const isPrivateList = lists?.find((list) => list.id === listId)?.visibility === "private";
  const isPending = item?.status === "pending";
  const isTaken = item?.status === "claimed" || item?.status === "assigned";
  const isCreator = item?.createdBy === currentUserId;
  const isClaimer = item?.claimedBy === currentUserId;
  const isAssignee = item?.assignedTo === currentUserId;
  const canManage = !!item && (isAdmin || isCreator);
  const form = useEditItemForm({ houseId, listId, item: isPending || isTaken ? item : null });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const archiving = item?.status === "bought";

  const deleteItem = useDeleteItem(houseId, listId);

  const handleDelete = async () => {
    if (!item) return;
    try {
      await deleteItem.mutateAsync(item.id);
      toast.success(`${archiving ? "Archived" : "Deleted"} "${item.name}"`);
      setConfirmDelete(false);
      onClose();
    } catch {
      toast.error(archiving ? "Couldn't archive that item. Try again." : "Failed to delete item");
    }
  };

  return (
    <>
      <BottomSheet
        open={open && (!!item || (itemId !== null && itemPending))}
        onClose={onClose}
        label="Item details"
        showClose={!isPending && !isTaken}
      >
        {item && isPending ? (
          <PendingItemDetails
            item={item}
            form={form}
            houseId={houseId}
            listId={listId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            canEdit={canManage}
            canDelete={canManage}
            isPrivateList={isPrivateList}
            onDelete={() => setConfirmDelete(true)}
            onClose={onClose}
          />
        ) : item && isTaken ? (
          <AssignedItemDetails
            item={item}
            form={form}
            houseId={houseId}
            listId={listId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            canEdit={canManage || isClaimer}
            canDelete={canManage}
            canUnassign={canManage || isClaimer || isAssignee || item.assignedBy === currentUserId}
            onDelete={() => setConfirmDelete(true)}
            onMarkBought={() => {
              onClose();
              router.push(markBoughtPath(listId, item.id));
            }}
            onClose={onClose}
          />
        ) : item ? (
          <BoughtItemDetails
            item={item}
            houseId={houseId}
            listId={listId}
            canArchive={canManage}
            onArchive={() => setConfirmDelete(true)}
            onClose={onClose}
          />
        ) : itemPending ? (
          <ItemDetailSkeleton />
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        copy={archiving ? CONFIRM_COPY.archiveBoughtItem : CONFIRM_COPY.deleteItem}
        isPending={deleteItem.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
