import { toast } from "@kinwoo/client/toast";
import {
  formatPaise,
  itemCountLabel,
  TRANSACTION_UNAVAILABLE,
  type BoughtGroup,
} from "@kinwoo/core/grocery";
import { TransactionIcon, TrashIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { ScrollView, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Pressable } from "@/components/Pressable";
import { openExpense } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

import { BoughtTimeline } from "./BoughtTimeline";

const ITEM_WIDTH = 88;

export function BoughtGroupSheet({
  open,
  group,
  houseId,
  canDelete,
  onClose,
  onOpenItem,
  onDelete,
}: {
  open: boolean;
  group: BoughtGroup | null;
  houseId: string;
  canDelete: boolean;
  onClose: () => void;
  onOpenItem: (itemId: string, listId: string) => void;
  onDelete: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const lead = group?.items[0];

  const viewTransaction = () => {
    const expenseId = lead?.purchase?.expenseId;
    if (!expenseId) return toast.error(TRANSACTION_UNAVAILABLE);
    onClose();
    openExpense(expenseId);
  };

  return (
    <BottomSheet open={open && group !== null} onClose={onClose} label="Bought items" showClose>
      {group ? (
        <View className="gap-12 pb-4 pt-12 -mx-6">
          <View className="flex-row items-start gap-5 mx-6">
            <View className="size-12 items-center justify-center rounded-xl bg-muted">
              <CategoryIcon
                name={lead?.categoryName ?? undefined}
                size={26}
                color={palette.foreground}
              />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text numberOfLines={2} className="font-display-medium text-base text-foreground">
                {group.label}
              </Text>
              <Text className="font-display-normal text-sm text-muted-foreground">
                {itemCountLabel(group.items.length)}
              </Text>
            </View>
            <View className="max-w-[45%] items-end gap-1">
              <Text className="font-display-normal text-base text-foreground">
                {formatPaise(group.totalPaise)}
              </Text>
              {group.store ? (
                <Text
                  numberOfLines={1}
                  className="font-display-normal text-sm text-muted-foreground"
                >
                  {group.store}
                </Text>
              ) : null}
            </View>
          </View>

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            accessibilityRole="list"
            contentContainerClassName="gap-1 px-4"
          >
            {group.items.map((item) => {
              const amountLabel = formatPaise(item.purchase?.pricePaise ?? 0);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${amountLabel}`}
                  accessibilityHint="Opens item details"
                  onPress={() => onOpenItem(item.id, item.listId)}
                  className="items-center gap-2 rounded-xl p-1 active:bg-muted/60"
                  style={{ width: ITEM_WIDTH }}
                >
                  <View className="size-10 items-center justify-center rounded-xl bg-muted">
                    <CategoryIcon
                      name={item.categoryName ?? undefined}
                      size={20}
                      color={palette.foreground}
                    />
                  </View>
                  <View className="w-full items-center gap-0.5">
                    <Text
                      numberOfLines={1}
                      className="text-center font-display-medium text-sm text-foreground"
                    >
                      {item.name}
                    </Text>
                    <Text className="text-center font-display-normal text-xs text-muted-foreground">
                      {amountLabel}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* The batch shares one buyer, so the lead item's history stands in for the purchase. */}
          {lead ? <BoughtTimeline item={lead} houseId={houseId} listId={lead.listId} /> : null}

          <View className="mx-6 flex-row items-center gap-3">
            {canDelete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete items"
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
      ) : null}
    </BottomSheet>
  );
}
