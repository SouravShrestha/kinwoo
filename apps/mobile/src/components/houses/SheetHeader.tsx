import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

export function SheetHeader({
  title,
  subtitle,
  onBack,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <View accessibilityRole="header" className="pr-10">
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={onBack}
          className="-ml-2 size-9 items-center justify-center active:opacity-60"
        >
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ArrowRightIcon size={24} color={colors[resolvedTheme].foreground} />
          </View>
        </Pressable>
      ) : null}
      {title ? (
        <View className={onBack ? "mt-4" : ""}>
          <Text className="font-display-medium text-xl text-foreground">{title}</Text>
          {subtitle ? (
            <Text className="mt-0.5 text-sm text-muted-foreground font-display-normal">
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
