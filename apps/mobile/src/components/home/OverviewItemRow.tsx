import { listIconOption, type GroceryOverviewItem } from "@kinwoo/core/grocery";
import { Text, View } from "react-native";

import { ListIconImage } from "@/components/grocery/ListIconImage";
import { Pressable } from "@/components/Pressable";

const BADGE = {
  primary: { box: "bg-primary/10", text: "text-primary" },
  muted: { box: "bg-muted", text: "text-muted-foreground" },
} as const;

export type OverviewBadge = { label: string; tone: keyof typeof BADGE };

type OverviewItemRowProps = {
  item: GroceryOverviewItem;
  badge: OverviewBadge;
  onPress: (item: GroceryOverviewItem) => void;
};

export function OverviewItemRow({ item, badge, onPress }: OverviewItemRowProps) {
  const quantity = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, from ${item.listName}`}
      onPress={() => onPress(item)}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-70"
    >
      <View className="size-10 items-center justify-center rounded-xl bg-muted">
        <ListIconImage label={listIconOption(item.listIcon).label} size={32} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="font-display-medium text-base text-foreground">
          {item.name}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-0.5 font-display-normal text-xs text-muted-foreground"
        >
          {quantity ? `${quantity} · ${item.listName}` : item.listName}
        </Text>
      </View>
      <View className={`max-w-[110px] rounded-full px-2.5 py-1 ${BADGE[badge.tone].box}`}>
        <Text numberOfLines={1} className={`font-display-medium text-xs ${BADGE[badge.tone].text}`}>
          {badge.label}
        </Text>
      </View>
    </Pressable>
  );
}
