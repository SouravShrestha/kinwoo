import { PlusCircleIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

const FAB_SIZE = 48;

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const { resolvedTheme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={16}
      pressRetentionOffset={32}
      className="absolute bottom-6 right-4 size-12 items-center justify-center active:opacity-80"
    >
      {/* Children must not capture touches, or taps landing on the SVG can be dropped. */}
      <View pointerEvents="none" className="size-12 items-center justify-center">
        <View className="absolute inset-2.5 rounded-full bg-primary-foreground" />
        <PlusCircleIcon size={FAB_SIZE} color={colors[resolvedTheme].primary} />
      </View>
    </Pressable>
  );
}
