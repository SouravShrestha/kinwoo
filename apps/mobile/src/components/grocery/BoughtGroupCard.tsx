import { boughtGroupAccessibleLabel, itemCountLabel, type BoughtGroup } from "@kinwoo/core/grocery";
import { ArrowRightIcon, CategoryIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

import type { CardAssignee } from "./PendingItemCard";

export function BoughtGroupCard({
  group,
  buyer,
  width,
  onOpen,
}: {
  group: BoughtGroup;
  buyer?: CardAssignee;
  width: number;
  onOpen: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const lead = group.items[0];

  return (
    <View className="rounded-2xl border border-border bg-card" style={{ width }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={boughtGroupAccessibleLabel(group, buyer?.name ?? null)}
        accessibilityHint="Shows the items in this purchase"
        onPress={onOpen}
        className="gap-3 rounded-2xl p-3 active:opacity-80"
      >
        <View className="flex-row items-center justify-between">
          <View className="size-6 items-center justify-center">
            <CategoryIcon
              name={lead?.categoryName ?? undefined}
              size={20}
              color={palette.foreground}
            />
          </View>
          <View className="size-7 items-center justify-center rounded-full border border-dialog-border">
            <View style={{ transform: [{ rotate: "-90deg" }] }}>
              <ArrowRightIcon size={16} color={palette.foreground} />
            </View>
          </View>
        </View>
        <View className="min-w-0 gap-0.5">
          <Text className="text-xs text-muted-foreground font-display-normal" numberOfLines={1}>
            {itemCountLabel(group.items.length)}
          </Text>
          <Text
            className={`text-sm text-foreground font-display-medium ${buyer ? "pr-8" : ""}`}
            numberOfLines={1}
          >
            {group.label}
          </Text>
        </View>
      </Pressable>

      {buyer ? (
        <View pointerEvents="none" className="absolute bottom-3 right-3">
          <Avatar name={buyer.name} url={buyer.avatarUrl} size={24} />
        </View>
      ) : null}
    </View>
  );
}
