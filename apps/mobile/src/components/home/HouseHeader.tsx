import { HousePinIcon } from "@kinwoo/icons/native";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

import { useTheme } from "@/theme/ThemeProvider";

type HouseHeaderProps = {
  name: string | null;
  address: string | null;
  onPressHouse: () => void;
};

export function HouseHeader({ name, address, onPressHouse }: HouseHeaderProps) {
  const { resolvedTheme, colors } = useTheme();
  const primary = colors[resolvedTheme].primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens the house menu"
      onPress={onPressHouse}
      className="max-w-[70%] active:opacity-60"
    >
      <View className="flex-row items-center gap-1.5 -ml-1">
        {name ? <HousePinIcon size={18} color={primary} /> : null}
        <Text
          numberOfLines={1}
          className="shrink font-display-medium text-lg tracking-[-0.36px] text-foreground"
        >
          {name ?? ""}
        </Text>
      </View>
      {address ? (
        <Text
          numberOfLines={1}
          className="mt-0.5 text-xs text-muted-foreground font-display-medium"
        >
          {address}
        </Text>
      ) : null}
    </Pressable>
  );
}
