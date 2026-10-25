import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

export function MenuCard({
  icon,
  stack,
  caption,
  title,
  tall = false,
  onPress,
}: {
  icon: ReactNode;
  stack?: ReactNode;
  caption?: string;
  title: string;
  tall?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${title}, ${caption}` : title}
      onPress={onPress}
      className={`justify-between rounded-lg border border-border bg-card p-5 active:opacity-80 ${
        tall ? "h-40 flex-1" : "h-[168px] pt-3"
      }`}
    >
      <View className="-mr-2 items-end">
        <View className="size-9 items-center justify-center rounded-full bg-background border border-border">
          {icon}
        </View>
      </View>
      <View>
        {stack ? <View className="mb-2">{stack}</View> : null}
        {caption ? (
          <Text className="mb-1 text-sm text-foreground font-display-normal">{caption}</Text>
        ) : null}
        <Text className="text-lg text-foreground font-display-normal">{title}</Text>
      </View>
    </Pressable>
  );
}
