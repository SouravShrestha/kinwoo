import {
  privateSpendAccessibleLabel,
  privateSpendAmountLabel,
  privateSpendSubtitle,
  type PrivateSpendEntry,
} from "@kinwoo/core/grocery";
import { LockIcon } from "@kinwoo/icons/native";
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={privateSpendAccessibleLabel(entry)}
      onPress={onOpen}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-80"
    >
      <View className="size-10 items-center justify-center rounded-xl bg-muted">
        <CategoryIcon name={entry.categoryName ?? undefined} size={22} color={palette.foreground} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-display-medium text-sm text-foreground">
          {entry.label}
        </Text>
        <Text numberOfLines={1} className="font-display-normal text-xs text-muted-foreground">
          {privateSpendSubtitle(entry)}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text
          className={
            entry.amountPaise === null
              ? "font-display-normal text-sm text-muted-foreground"
              : "font-display-medium text-sm text-foreground"
          }
        >
          {privateSpendAmountLabel(entry)}
        </Text>
        <View className="flex-row items-center gap-1">
          <LockIcon size={11} color={palette.mutedForeground} />
          <Text className="font-display-normal text-xs text-muted-foreground">Not split</Text>
        </View>
      </View>
    </Pressable>
  );
}
