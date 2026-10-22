import { useGroceryItemActivity } from "@kinwoo/client/grocery";
import { useHouseMembers } from "@kinwoo/client/houses";
import { boughtItemTimeline, formatTimelineTime, type GroceryItem } from "@kinwoo/core/grocery";
import { colors } from "@kinwoo/tokens/native";
import { ScrollView, Text, View } from "react-native";

import { Avatar } from "@/components/houses/Avatar";
import { useTheme } from "@/theme/ThemeProvider";

const STEP_AVATAR_SIZE = 24;
const STEP_WIDTH = 175;

export function BoughtTimeline({
  item,
  houseId,
  listId,
}: {
  item: GroceryItem;
  houseId: string;
  listId: string;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { data: activity } = useGroceryItemActivity(houseId, listId, item.id);
  const { data: members } = useHouseMembers(houseId);
  const steps = boughtItemTimeline(item, activity);

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      accessibilityRole="list"
      className="pl-7"
    >
      {steps.map((step, index) => {
        const member = members?.find((m) => m.userId === step.userId);
        const name = member?.displayName ?? step.name ?? "A housemate";
        const time = step.at ? formatTimelineTime(step.at) : null;
        const isLast = index === steps.length - 1;

        return (
          <View
            key={step.label}
            accessible
            accessibilityLabel={[step.label, name, time].filter(Boolean).join(", ")}
            className={isLast ? "pr-2" : undefined}
            style={isLast ? { maxWidth: STEP_WIDTH } : { width: STEP_WIDTH }}
          >
            <View className="flex-row items-center mt-2">
              <Avatar name={name} url={member?.avatarUrl ?? null} size={STEP_AVATAR_SIZE} />
              {isLast ? null : (
                <View
                  className="mx-2 rounded-full h-0.5 flex-1"
                  style={{ backgroundColor: palette.border }}
                />
              )}
            </View>
            <Text className="mt-4 font-display-normal text-sm text-muted-foreground">
              {step.label}
            </Text>
            <Text
              numberOfLines={2}
              className="mt-2 pr-3 font-display-medium text-base text-foreground"
            >
              {name}
            </Text>
            {time ? (
              <Text className="mt-2 font-display-normal text-xs text-muted-foreground">{time}</Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}
