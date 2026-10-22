import { router } from "expo-router";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

const BADGE = {
  primary: { box: "bg-primary/15", text: "text-primary" },
  destructive: { box: "bg-destructive/15", text: "text-destructive" },
} as const;

type SectionHeaderProps = {
  title: string;
  count: number;
  tone: keyof typeof BADGE;
};

export function SectionHeader({ title, count, tone }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <Text
          accessibilityRole="header"
          className="font-display-semibold text-base text-foreground"
        >
          {title}
        </Text>
        {count > 0 ? (
          <View className={`rounded-full px-2 py-0.5 ${BADGE[tone].box}`}>
            <Text className={`font-display-medium text-xs ${BADGE[tone].text}`}>{count}</Text>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="See all lists"
        hitSlop={8}
        onPress={() => router.push("/tasks")}
      >
        <Text className="font-display-medium text-xs text-muted-foreground">See all</Text>
      </Pressable>
    </View>
  );
}
