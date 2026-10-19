import { useAuth } from "@kinwoo/client/auth";
import {
  useDeleteItem,
  useEditItemForm,
  useGroceryItem,
  useGroceryLists,
} from "@kinwoo/client/grocery";
import { useActiveHouse } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { useState } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { openMarkBought } from "@/lib/house-navigation";

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
  const { activeHouse } = useActiveHouse();
  const isAdmin = activeHouse?.role === "admin";
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const currentUserName = user?.user_metadata?.displayName ?? user?.email ?? null;

  const { data: item } = useGroceryItem(houseId || null, listId || null, itemId);
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

  const deleteItem = useDeleteItem(houseId, listId);

  const handleDelete = async () => {
    if (!item) return;
    try {
      await deleteItem.mutateAsync(item.id);
      toast.success(`Deleted "${item.name}"`);
      setConfirmDelete(false);
      onClose();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  return (
    <>
      <BottomSheet
        open={open && !!item}
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
            canMarkBought={isAdmin || isClaimer || isAssignee}
            onDelete={() => setConfirmDelete(true)}
            onMarkBought={() => {
              onClose();
              openMarkBought(listId, item.id);
            }}
            onClose={onClose}
          />
        ) : item ? (
          <BoughtItemDetails
            item={item}
            houseId={houseId}
            listId={listId}
            canDelete={canManage}
            onDelete={() => setConfirmDelete(true)}
            onClose={onClose}
          />
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        copy={item?.status === "bought" ? CONFIRM_COPY.deleteBoughtItem : CONFIRM_COPY.deleteItem}
        isPending={deleteItem.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
