import { HousePinIcon, NotificationIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

import { useTheme } from "@/theme/ThemeProvider";

type HouseHeaderProps = {
  name: string | null;
  address: string | null;
  onPressHouse: () => void;
};

export function HouseHeader({ name, address, onPressHouse }: HouseHeaderProps) {
  const { resolvedTheme } = useTheme();
  const foreground = colors[resolvedTheme].foreground;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the house menu"
        onPress={onPressHouse}
        className="max-w-[70%] active:opacity-60"
      >
        <View className="flex-row items-center gap-1.5 -ml-1">
          {name ? <HousePinIcon size={18} color={foreground} /> : null}
          <Text numberOfLines={1} className="shrink font-display-medium text-lg text-foreground">
            {name ?? ""}
          </Text>
        </View>
        {address ? (
          <Text
            numberOfLines={1}
            className="mt-0.5 text-xs text-muted-foreground font-display-normal"
          >
            {address}
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={8}
        className="-mr-2 size-10 items-center justify-center active:opacity-60"
      >
        <NotificationIcon size={22} color={foreground} />
      </Pressable>
    </>
  );
}
