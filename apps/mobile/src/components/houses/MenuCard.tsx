import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Pressable } from "@/components/Pressable";

export function MenuCard({
  icon,
  stack,
  caption,
  title,
  size = "full",
  onPress,
}: {
  icon: ReactNode;
  stack?: ReactNode;
  caption?: string;
  title: string;
  // tall fills the height of the cards beside it; half is one short row.
  size?: "full" | "tall" | "half";
  onPress: () => void;
}) {
  const iconBadge = (
    <View className="size-9 items-center justify-center rounded-full bg-background border border-border">
      {icon}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={(caption ? `${title}, ${caption}` : title).replace("\n", " ")}
      onPress={onPress}
      className={`rounded-lg border border-border bg-card active:opacity-80 ${
        size === "half"
          ? "h-20 flex-row items-center justify-between gap-2 pl-4 pr-3"
          : size === "tall"
            ? "min-h-40 w-[45%] min-w-36 justify-between p-5"
            : "h-[168px] justify-between p-5 pt-3"
      }`}
    >
      {size === "half" ? (
        <>
          <Text className="shrink text-base leading-5 text-foreground font-display-normal">
            {title}
          </Text>
          {iconBadge}
        </>
      ) : (
        <>
          <View className="-mr-2 items-end">{iconBadge}</View>
          <View>
            {stack ? <View className="mb-2">{stack}</View> : null}
            {caption ? (
              <Text className="mb-1 text-sm text-foreground font-display-normal">{caption}</Text>
            ) : null}
            <Text className="text-lg text-foreground font-display-normal">{title}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}
