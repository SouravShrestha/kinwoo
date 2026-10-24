"use client";

import { useClaimItem, type EditItemForm } from "@kinwoo/client/grocery";
import { toast } from "@kinwoo/client/toast";
import type { GroceryItem } from "@kinwoo/core/grocery";
import { CaretDownIcon, TrashIcon } from "@kinwoo/icons";
import { useId, useState } from "react";

import { Button } from "@/components/Button";
import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

import { AssignMemberStrip } from "./AssignMemberStrip";
import { FOCUS_RING, ICON_BUTTON, ItemDetailsEditor, saveItemEdits } from "./ItemDetailsEditor";
import { useAssignToMember } from "./useAssignToMember";

const BUTTON_AVATAR_SIZE = 24;

export function PendingItemDetails({
  item,
  form,
  houseId,
  listId,
  currentUserId,
  currentUserName,
  canEdit,
  canDelete,
  isPrivateList,
  onDelete,
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
  isPrivateList: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const stripId = useId();

  const claimItem = useClaimItem(houseId, listId, currentUserId, currentUserName);
  const { members, self, isLoading, assign, assigningId } = useAssignToMember({
    houseId,
    listId,
    itemIds: [item.id],
    onAssigned: onClose,
  });

  const handleBuy = async () => {
    if (!(await saveItemEdits(form, canEdit))) return;
    try {
      const res = await claimItem.mutateAsync(item.id);
      if (res.claimed) {
        toast.success(`"${item.name}" is yours to buy`);
        onClose();
      } else {
        toast.error(
          res.claimedByName ? `Already claimed by ${res.claimedByName}` : "Item already claimed",
        );
      }
    } catch {
      toast.error("Couldn't assign that item to you. Try again.");
    }
  };

  const handleAssignTo = async (memberId: string, memberName: string) => {
    if (!(await saveItemEdits(form, canEdit))) return;
    await assign(memberId, memberName);
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
        // The sheet is anchored to the bottom, so the strip opening grows it upwards and the
        // button row stays put.
        <div className="mt-8 pb-4">
          {isPrivateList ? null : (
            <AssignMemberStrip
              id={stripId}
              expanded={expanded}
              members={members}
              isLoading={isLoading}
              assigningId={assigningId}
              onPick={(memberId, name) => void handleAssignTo(memberId, name)}
              className="-mx-6 px-6 pb-4"
            />
          )}

          <div className="flex items-center gap-3">
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
            {isPrivateList ? null : (
              <Button
                label="Assign"
                variant="outline"
                aria-label="Assign to a housemate"
                aria-expanded={expanded}
                aria-controls={stripId}
                iconEnd={
                  <CaretDownIcon
                    size={8}
                    className={cn(
                      "transition-transform duration-200 motion-reduce:transition-none",
                      expanded && "rotate-180",
                    )}
                  />
                }
                onClick={() => setExpanded((value) => !value)}
                className="min-h-12 min-w-0 flex-1 px-3"
              />
            )}
            <Button
              label="I'll buy"
              loading={claimItem.isPending}
              onClick={() => void handleBuy()}
              icon={
                self ? (
                  <Avatar name={self.displayName} url={self.avatarUrl} size={BUTTON_AVATAR_SIZE} />
                ) : undefined
              }
              className="min-h-12 min-w-0 flex-1 px-3"
            />
          </div>
        </div>
      }
    />
  );
}
