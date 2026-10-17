import { itemUrgencyLabel, itemUrgencyTone, type GroceryItem } from "@kinwoo/core/grocery";
import { ArrowRightIcon, TickIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { CategoryIcon } from "@/components/CategoryIcon";
import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

const ASSIGNEE_AVATAR_SIZE = 24;

export type CardAssignee = { name: string | null; avatarUrl: string | null };

export function PendingItemCard({
  item,
  selected = false,
  onToggleSelect,
  onOpen,
  width,
  assignee,
  assigneeVerb = "assigned to",
}: {
  item: GroceryItem;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen: () => void;
  width: number;
  assignee?: CardAssignee;
  assigneeVerb?: string;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  const quantityUnit = [item.quantity != null ? String(item.quantity) : "", item.unit ?? ""]
    .filter(Boolean)
    .join(" ");

  const urgencyTone = item.status === "bought" ? null : itemUrgencyTone(item.urgency);
  const label = [
    item.name,
    quantityUnit,
    urgencyTone ? `needed ${itemUrgencyLabel(item.urgency).toLowerCase()}` : "",
    assignee ? `${assigneeVerb} ${assignee.name ?? "a housemate"}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View
      className={`rounded-2xl border ${selected ? "border-foreground bg-muted" : "border-border bg-card"}`}
      style={{ width }}
    >
      <Pressable
        accessibilityRole={onToggleSelect ? "checkbox" : "button"}
        accessibilityState={onToggleSelect ? { checked: selected } : undefined}
        accessibilityLabel={label}
        // Screen-reader users can't easily hit the small arrow, so details are also an action.
        accessibilityActions={[{ name: "openDetails", label: "Open details" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "openDetails") onOpen();
        }}
        allowDoublePress
        onPress={onToggleSelect ?? onOpen}
        className="gap-3 rounded-2xl p-3 active:opacity-80"
      >
        <View className="flex-row items-center justify-between">
          <View className="size-6 items-center justify-center">
            <CategoryIcon
              name={item.categoryName ?? undefined}
              size={20}
              color={palette.foreground}
            />
            {selected ? (
              <View className="absolute -right-1 -top-1 size-4 items-center justify-center rounded-full bg-foreground">
                <TickIcon size={7} color={palette.background} />
              </View>
            ) : null}
          </View>
          <View className="size-7" />
        </View>
        <View className="min-w-0 gap-0.5">
          <View className="min-h-4 justify-center">
            {quantityUnit ? (
              <Text className="text-xs text-muted-foreground font-display-normal" numberOfLines={1}>
                {quantityUnit}
              </Text>
            ) : null}
          </View>
          <Text
            className={`text-sm text-foreground font-display-medium ${assignee ? "pr-8" : ""}`}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>
      </Pressable>

      {assignee ? (
        <View pointerEvents="none" className="absolute bottom-3 right-3">
          <Avatar
            name={assignee.name}
            url={assignee.avatarUrl}
            size={ASSIGNEE_AVATAR_SIZE}
            tone={selected ? "background" : "muted"}
          />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.name} details`}
        hitSlop={10}
        onPress={onOpen}
        className="absolute right-3 top-3 size-7 items-center justify-center rounded-full border border-dialog-border active:border-foreground"
      >
        <View style={{ transform: [{ rotate: "-90deg" }] }}>
          <ArrowRightIcon size={16} color={palette.foreground} />
        </View>
      </Pressable>
    </View>
  );
}
