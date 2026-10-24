import {
  privateSpendAccessibleLabel,
  privateSpendAmountLabel,
  privateSpendDateParts,
  privateSpendDetail,
  type PrivateSpendEntry,
} from "@kinwoo/core/grocery";
import { Text, View } from "react-native";

import { ItemCategoryImage } from "@/components/grocery/ItemCategoryImage";
import { Pressable } from "@/components/Pressable";

export function PrivatePurchaseRow({
  entry,
  onOpen,
}: {
  entry: PrivateSpendEntry;
  onOpen: () => void;
}) {
  const { month, day } = privateSpendDateParts(entry);
  const detail = privateSpendDetail(entry);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={privateSpendAccessibleLabel(entry)}
      onPress={onOpen}
      className="flex-row items-center px-4 py-5 active:opacity-70"
    >
      <View className="w-8 items-center">
        <Text className="font-display-normal text-xs text-muted-foreground">{month}</Text>
        <Text className="font-display-normal text-lg leading-6 text-muted-foreground">{day}</Text>
      </View>
      <View className="ml-3 mr-4 size-10 items-center justify-center rounded-lg bg-muted">
        <ItemCategoryImage name={entry.categoryName} size={34} />
      </View>
      <View className="mr-3 min-w-0 flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-display-normal text-base text-foreground">
          {entry.label}
        </Text>
        {detail ? (
          <Text numberOfLines={1} className="font-display-normal text-xs text-muted-foreground">
            {detail}
          </Text>
        ) : null}
      </View>
      <Text
        className={
          entry.amountPaise === null
            ? "font-display-normal text-base text-muted-foreground"
            : "font-display-medium text-base text-foreground"
        }
      >
        {privateSpendAmountLabel(entry)}
      </Text>
    </Pressable>
  );
}
