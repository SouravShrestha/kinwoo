"use client";

import { useUnassignItem, type EditItemForm } from "@kinwoo/client/grocery";
import { toast } from "@kinwoo/client/toast";
import type { GroceryItem } from "@kinwoo/core/grocery";
import { VerifiedIcon, TrashIcon } from "@kinwoo/icons";

import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

import { FOCUS_RING, ICON_BUTTON, ItemDetailsEditor, saveItemEdits } from "./ItemDetailsEditor";

export function AssignedItemDetails({
  item,
  form,
  houseId,
  listId,
  currentUserId,
  currentUserName,
  canEdit,
  canDelete,
  canUnassign,
  onDelete,
  onMarkBought,
  onClose,
}: {
  item: GroceryItem;
  form: EditItemForm;
  houseId: string;
  listId: string;
  currentUserId: string;
  currentUserName: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canUnassign: boolean;
  onDelete: () => void;
  onMarkBought: () => void;
  onClose: () => void;
}) {
  const unassignItem = useUnassignItem(houseId, listId);

  const handleUnassign = async () => {
    if (!(await saveItemEdits(form, canEdit))) return;
    try {
      await unassignItem.mutateAsync(item.id);
      toast.success(`"${item.name}" is back in Pending`);
      onClose();
    } catch {
      toast.error("Couldn't unassign that item. Try again.");
    }
  };

  const handleMarkBought = async () => {
    if (await saveItemEdits(form, canEdit)) onMarkBought();
  };

  return (
    <ItemDetailsEditor
      item={item}
      form={form}
      houseId={houseId}
      listId={listId}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      canEdit={canEdit}
      onClose={onClose}
      footer={
        <div className="mt-8 flex items-center gap-3 pb-4">
          {canDelete ? (
            <button
              type="button"
              aria-label="Delete item"
              aria-haspopup="dialog"
              onClick={onDelete}
              className={cn(ICON_BUTTON, FOCUS_RING)}
            >
              <TrashIcon size={18} />
            </button>
          ) : null}
          {canUnassign ? (
            <Button
              label="Unassign"
              variant="outline"
              loading={unassignItem.isPending}
              onClick={() => void handleUnassign()}
              className="h-12 min-w-0 flex-1 px-3"
            />
          ) : null}
          <Button
            label="Bought"
            aria-haspopup="dialog"
            icon={<VerifiedIcon size={18} />}
            onClick={() => void handleMarkBought()}
            className="h-12 min-w-0 flex-1 px-3"
          />
        </div>
      }
    />
  );
}
