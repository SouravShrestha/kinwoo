import { listIconOption, type GroceryOverviewItem } from "@kinwoo/core/grocery";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { CategoryIcon } from "@/components/CategoryIcon";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

type TodayItemsSectionProps = {
  items: GroceryOverviewItem[];
  onItemPress: (item: GroceryOverviewItem) => void;
};

export function TodayItemsSection({ items, onItemPress }: TodayItemsSectionProps) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="font-display-semibold text-base text-foreground">
            Needs buying today
          </Text>
          {items.length > 0 ? (
            <View className="rounded-full bg-destructive/15 px-2 py-0.5">
              <Text className="font-display-medium text-xs text-destructive">{items.length}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {items.length === 0 ? (
        <View className="items-center justify-center rounded-2xl border border-dashed border-border p-4">
          <Text className="font-display-normal text-sm text-muted-foreground">
            Nothing urgently needed today
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, from ${item.listName}`}
              onPress={() => onItemPress(item)}
              className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3.5 active:opacity-70"
            >
              <View className="mr-3 flex-1">
                <Text numberOfLines={1} className="font-display-medium text-base text-foreground">
                  {item.name}
                </Text>
                <View className="mt-1 flex-row items-center gap-2">
                  {item.quantity ? (
                    <Text className="font-display-normal text-xs text-muted-foreground">
                      {item.quantity} {item.unit ?? ""}
                    </Text>
                  ) : null}
                  <View className="flex-row items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                    <CategoryIcon
                      name={listIconOption(item.listIcon).label}
                      size={12}
                      color={palette.mutedForeground}
                    />
                    <Text
                      numberOfLines={1}
                      className="max-w-[90px] font-display-medium text-[11px] text-muted-foreground"
                    >
                      {item.listName}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="items-end">
                {item.status === "claimed" ? (
                  <View className="rounded-full bg-primary/10 px-2.5 py-1">
                    <Text className="font-display-medium text-xs text-primary">
                      {item.claimedByName ? `${item.claimedByName}` : "Claimed"}
                    </Text>
                  </View>
                ) : item.status === "assigned" ? (
                  <View className="rounded-full bg-primary/10 px-2.5 py-1">
                    <Text className="font-display-medium text-xs text-primary">
                      {item.assignedToName ? `→ ${item.assignedToName}` : "Assigned"}
                    </Text>
                  </View>
                ) : (
                  <View className="rounded-full bg-muted px-2.5 py-1">
                    <Text className="font-display-medium text-xs text-muted-foreground">
                      Unclaimed
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
