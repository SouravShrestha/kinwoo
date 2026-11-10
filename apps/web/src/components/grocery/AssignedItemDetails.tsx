"use client";

import { useMarkItemMissed, useUnassignItem, type EditItemForm } from "@kinwoo/client/grocery";
import { toast } from "@kinwoo/client/toast";
import { MISSED_REASONS, type GroceryItem } from "@kinwoo/core/grocery";
import { VerifiedIcon, TrashIcon } from "@kinwoo/icons";
import { useState } from "react";

import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

import { FOCUS_RING, ICON_BUTTON, ItemDetailsEditor, saveItemEdits } from "./ItemDetailsEditor";
import { OptionSheet } from "./OptionSheet";

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
  canMiss,
  onDelete,
  onMarkBought,
  onClose,
  onRequestClose,
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
  /** The holder gets "Couldn't get" in place of Unassign, so the house hears why. */
  canMiss: boolean;
  onDelete: () => void;
  onMarkBought: () => void;
  onClose: () => void;
  /** The header close button; may ask before discarding edits. */
  onRequestClose: () => void;
}) {
  const unassignItem = useUnassignItem(houseId, listId);
  const markMissed = useMarkItemMissed(houseId, listId);
  const [askReason, setAskReason] = useState(false);

  const handleUnassign = async () => {
    if (!(await saveItemEdits(form, canEdit))) return;
    try {
      await unassignItem.mutateAsync({ itemId: item.id });
      toast.success(`"${item.name}" is back in Pending`);
      onClose();
    } catch {
      toast.error("Couldn't unassign that item. Try again.");
    }
  };

  const handleMissed = async (reason: string | null) => {
    setAskReason(false);
    if (!(await saveItemEdits(form, canEdit))) return;
    try {
      await markMissed.mutateAsync({ itemId: item.id, reason });
      toast.success(`"${item.name}" is back on the list for someone else`);
      onClose();
    } catch {
      toast.error("Couldn't hand that item back. Try again.");
    }
  };

  const handleMarkBought = async () => {
    if (await saveItemEdits(form, canEdit)) onMarkBought();
  };

  return (
    <>
      <ItemDetailsEditor
        item={item}
        form={form}
        houseId={houseId}
        listId={listId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        canEdit={canEdit}
        onDelete={canDelete ? onDelete : undefined}
        onClose={onClose}
        onRequestClose={onRequestClose}
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
            {canMiss ? (
              <Button
                label="Couldn't get"
                variant="outline"
                aria-haspopup="dialog"
                loading={markMissed.isPending}
                onClick={() => setAskReason(true)}
                className="min-h-12 min-w-0 flex-1 px-3"
              />
            ) : canUnassign ? (
              <Button
                label="Unassign"
                variant="outline"
                loading={unassignItem.isPending}
                onClick={() => void handleUnassign()}
                className="min-h-12 min-w-0 flex-1 px-3"
              />
            ) : null}
            <Button
              label="Bought"
              aria-haspopup="dialog"
              icon={<VerifiedIcon size={18} />}
              onClick={() => void handleMarkBought()}
              className="min-h-12 min-w-0 flex-1 px-3"
            />
          </div>
        }
      />
      <OptionSheet
        open={askReason}
        onClose={() => setAskReason(false)}
        title="What happened?"
        columns={2}
        options={MISSED_REASONS.map((reason) => ({ id: reason, label: reason }))}
        selectedId={null}
        onSelect={(id) => void handleMissed(id === MISSED_REASONS.at(-1) ? null : id)}
      />
    </>
  );
}
