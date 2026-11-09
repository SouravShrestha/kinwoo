import { itemNeededLabel, type GroceryItem } from "@kinwoo/core/grocery";
import { ArrowRightIcon, TickIcon } from "@kinwoo/icons/native";
import { Text, View } from "react-native";

import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

import { ItemCategoryImage } from "./ItemCategoryImage";

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
  const { resolvedTheme, colors } = useTheme();
  const palette = colors[resolvedTheme];

  const quantityUnit = [item.quantity != null ? String(item.quantity) : "", item.unit ?? ""]
    .filter(Boolean)
    .join(" ");

  const needed = itemNeededLabel(item);
  const label = [
    item.name,
    quantityUnit,
    needed?.text ?? "",
    assignee ? `${assigneeVerb} ${assignee.name ?? "a housemate"}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View
      className={`rounded-2xl border ${selected ? "border-primary bg-muted" : "border-card-border bg-card"}`}
      style={{ width }}
    >
      {needed?.state === "overdue" ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          className="absolute inset-0 overflow-hidden rounded-2xl"
        >
          <View
            className="absolute bg-foreground py-px"
            style={{ left: -41, top: 9, width: 112, transform: [{ rotate: "-45deg" }] }}
          >
            <Text className="text-center text-[7px] leading-[10px] tracking-wide text-card font-display-semibold">
              Overdue
            </Text>
          </View>
        </View>
      ) : null}
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
          <View className="size-10 items-center justify-center">
            <ItemCategoryImage name={item.categoryName} size={40} />
            {selected ? (
              <View className="absolute -right-1 -top-1 size-4 items-center justify-center rounded-full bg-primary">
                <TickIcon size={7} color={palette.primaryForeground} />
              </View>
            ) : null}
          </View>
          <View className="size-7" />
        </View>
        <View className="min-w-0 gap-0.5">
          <View className="min-h-4 justify-center">
            {quantityUnit ? (
              <Text className="text-xs text-muted-foreground font-display-medium" numberOfLines={1}>
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
        className="absolute right-3 top-3 size-7 items-center justify-center rounded-full border border-dialog-border active:border-primary"
      >
        <View style={{ transform: [{ rotate: "-90deg" }] }}>
          <ArrowRightIcon size={16} color={palette.mutedForeground} />
        </View>
      </Pressable>
    </View>
  );
}
