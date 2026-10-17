import { useUnassignItem, type EditItemForm } from "@kinwoo/client/grocery";
import { toast } from "@kinwoo/client/toast";
import type { GroceryItem } from "@kinwoo/core/grocery";
import { VerifiedIcon, TrashIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { View } from "react-native";

import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { SheetFooter } from "@/components/sheet-footer";
import { useTheme } from "@/theme/ThemeProvider";

import {
  BUTTON_ROW_HEIGHT,
  FOOTER_BOTTOM_PADDING,
  FOOTER_GAP,
  ItemDetailsEditor,
  saveItemEdits,
} from "./ItemDetailsEditor";

const FOOTER_MAX_HEIGHT = FOOTER_GAP + BUTTON_ROW_HEIGHT + FOOTER_BOTTOM_PADDING;

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
  canMarkBought,
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
  canMarkBought: boolean;
  onDelete: () => void;
  onMarkBought: () => void;
  onClose: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
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
        <SheetFooter maxHeight={FOOTER_MAX_HEIGHT}>
          <View style={{ paddingTop: FOOTER_GAP, paddingBottom: FOOTER_BOTTOM_PADDING }}>
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
              {canUnassign ? (
                <Button
                  label="Unassign"
                  variant="outline"
                  loading={unassignItem.isPending}
                  onPress={() => void handleUnassign()}
                  className="h-12 flex-1 px-3"
                />
              ) : null}
              {canMarkBought ? (
                <Button
                  label="Bought"
                  icon={<VerifiedIcon size={18} color={palette.primaryForeground} />}
                  onPress={() => void handleMarkBought()}
                  className="h-12 flex-1 px-3"
                />
              ) : null}
            </View>
          </View>
        </SheetFooter>
      }
    />
  );
}
