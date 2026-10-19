import { toast } from "@kinwoo/client/toast";
import {
  formatPaise,
  itemQuantityLabel,
  TRANSACTION_UNAVAILABLE,
  type GroceryItem,
} from "@kinwoo/core/grocery";
import { TransactionIcon, TrashIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Pressable } from "@/components/Pressable";
import { openExpense } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

import { BoughtTimeline } from "./BoughtTimeline";

export function BoughtItemDetails({
  item,
  houseId,
  listId,
  canDelete,
  onDelete,
  onClose,
}: {
  item: GroceryItem;
  houseId: string;
  listId: string;
  canDelete: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  const viewTransaction = () => {
    const expenseId = item.purchase?.expenseId;
    if (!expenseId) return toast.error(TRANSACTION_UNAVAILABLE);
    onClose();
    openExpense(expenseId);
  };

  const quantity = itemQuantityLabel(item);
  const pricePaise = item.purchase?.pricePaise ?? null;
  const store = item.purchase?.store ?? null;

  return (
    <View className="gap-12 pb-4 pt-12 -mx-6">
      <View className="gap-5">
        <View className="flex-row items-start gap-5 mx-6">
          <View className="size-12 items-center justify-center rounded-xl bg-muted">
            <CategoryIcon
              name={item.categoryName ?? undefined}
              size={26}
              color={palette.foreground}
            />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <Text numberOfLines={2} className="font-display-medium text-base text-foreground">
              {item.name}
            </Text>
            {quantity ? (
              <Text className="font-display-normal text-sm text-muted-foreground">{quantity}</Text>
            ) : null}
          </View>
          {pricePaise != null || store ? (
            <View className="max-w-[45%] items-end gap-1">
              {pricePaise != null ? (
                <Text className="font-display-normal text-base text-foreground">
                  {formatPaise(pricePaise)}
                </Text>
              ) : null}
              {store ? (
                <Text
                  numberOfLines={1}
                  className="font-display-normal text-sm text-muted-foreground"
                >
                  {store}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {item.note ? (
          <View
            accessible
            accessibilityLabel={`Note: ${item.note}`}
            className="mx-6 min-h-12 justify-center rounded-xl bg-muted px-5 py-3 -mb-3 mt-2"
          >
            <Text className="font-display-normal text-base text-foreground">{item.note}</Text>
          </View>
        ) : null}
      </View>

      <BoughtTimeline item={item} houseId={houseId} listId={listId} />

      <View className="mx-6 flex-row items-center gap-3">
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
        <Button
          label="View transaction"
          icon={<TransactionIcon size={22} color={palette.primaryForeground} />}
          onPress={viewTransaction}
          className="h-12 flex-1 px-3"
        />
      </View>
    </View>
  );
}
