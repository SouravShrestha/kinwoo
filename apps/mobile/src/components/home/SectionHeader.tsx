import type { ReactNode } from "react";
import { Text, View } from "react-native";

type SectionHeaderProps = {
  title: string;
  count: number;
  trailing?: ReactNode;
};

export function SectionHeader({ title, count, trailing }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text accessibilityRole="header" className="font-display-normal text-sm text-foreground">
        {title}
        <Text className="font-display-normal text-muted-foreground">
          {" "}
          <Text className="text-xs">(</Text>
          {count}
          <Text className="text-xs">)</Text>
        </Text>
      </Text>
      {trailing}
    </View>
  );
}
