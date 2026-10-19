import {
  privateSpendAccessibleLabel,
  privateSpendAmountLabel,
  privateSpendDateParts,
  privateSpendDetail,
  type PrivateSpendEntry,
} from "@kinwoo/core/grocery";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { CategoryIcon } from "@/components/CategoryIcon";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

export function PrivatePurchaseRow({
  entry,
  onOpen,
}: {
  entry: PrivateSpendEntry;
  onOpen: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
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
        <CategoryIcon name={entry.categoryName ?? undefined} size={22} color={palette.foreground} />
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
