import { useClaimItem, type EditItemForm } from "@kinwoo/client/grocery";
import { toast } from "@kinwoo/client/toast";
import type { GroceryItem } from "@kinwoo/core/grocery";
import { TrashIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/Button";
import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { SheetFooter } from "@/components/sheet-footer";
import { useKeyboardVisible } from "@/lib/use-keyboard-visible";
import { useTheme } from "@/theme/ThemeProvider";

import {
  AssignMemberStrip,
  ExpandCaret,
  MEMBER_STRIP_HEIGHT,
  useExpandProgress,
} from "./AssignMemberStrip";
import {
  BUTTON_ROW_HEIGHT,
  FOOTER_BOTTOM_PADDING,
  FOOTER_GAP,
  ItemDetailsEditor,
  saveItemEdits,
  SHEET_INSET,
} from "./ItemDetailsEditor";
import { useAssignToMember } from "./useAssignToMember";

const BUTTON_AVATAR_SIZE = 24;
const FOOTER_MAX_HEIGHT =
  FOOTER_GAP + MEMBER_STRIP_HEIGHT + BUTTON_ROW_HEIGHT + FOOTER_BOTTOM_PADDING;

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
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const [expanded, setExpanded] = useState(false);
  const keyboardVisible = useKeyboardVisible();
  const stripOpen = expanded && !keyboardVisible;
  const progress = useExpandProgress(stripOpen);

  const claimItem = useClaimItem(houseId, listId, currentUserId, currentUserName);
  const { members, self, isLoading, assign, isAssigning } = useAssignToMember({
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
        <SheetFooter maxHeight={FOOTER_MAX_HEIGHT}>
          <View style={{ paddingTop: FOOTER_GAP, paddingBottom: FOOTER_BOTTOM_PADDING }}>
            {isPrivateList ? null : (
              <AssignMemberStrip
                progress={progress}
                expanded={stripOpen}
                members={members}
                isLoading={isLoading}
                isAssigning={isAssigning}
                onPick={(memberId, name) => void handleAssignTo(memberId, name)}
                inset={SHEET_INSET}
                bleed
                gapAt="bottom"
              />
            )}

            <View className="flex-row items-center gap-3" style={{ height: BUTTON_ROW_HEIGHT }}>
              {canDelete ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete item"
                  onPress={onDelete}
                  className="size-12 items-center justify-center rounded-xl border border-border active:bg-muted"
                >
                  <TrashIcon size={18} color={palette.foreground} />
                </Pressable>
              ) : null}
              {isPrivateList ? null : (
                <Button
                  label="Assign"
                  variant="outline"
                  accessibilityLabel="Assign to a housemate"
                  accessibilityState={{ expanded: stripOpen }}
                  iconEnd={<ExpandCaret progress={progress} color={palette.foreground} />}
                  onPress={() => setExpanded((value) => !value)}
                  className="h-12 flex-1 px-3"
                />
              )}
              <Button
                label="I'll buy"
                loading={claimItem.isPending}
                onPress={() => void handleBuy()}
                icon={
                  self ? (
                    <Avatar
                      name={self.displayName}
                      url={self.avatarUrl}
                      size={BUTTON_AVATAR_SIZE}
                    />
                  ) : undefined
                }
                className="h-12 flex-1 px-3"
              />
            </View>
          </View>
        </SheetFooter>
      }
    />
  );
}
