import { CaretDownIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  label: string;
  allTime: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onToggleAllTime: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

function StepButton({
  direction,
  disabled,
  onPress,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onPress: () => void;
}) {
  const { resolvedTheme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === "previous" ? "Previous month" : "Next month"}
      disabled={disabled}
      onPress={onPress}
      allowDoublePress
      className={`size-10 items-center justify-center ${disabled ? "opacity-30" : ""}`}
    >
      <View style={{ transform: [{ rotate: direction === "previous" ? "90deg" : "-90deg" }] }}>
        <CaretDownIcon size={12} color={colors[resolvedTheme].foreground} />
      </View>
    </Pressable>
  );
}

export function PeriodFilter({
  label,
  allTime,
  canGoPrevious,
  canGoNext,
  onToggleAllTime,
  onPrevious,
  onNext,
}: Props) {
  return (
    <View className="flex-row items-center justify-center gap-3 px-6">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: allTime }}
        onPress={onToggleAllTime}
        allowDoublePress
        className={`rounded-xl border px-4 py-2 ${
          allTime ? "border-foreground bg-foreground" : "border-border bg-card"
        }`}
      >
        <Text
          className={`font-display-medium text-sm ${allTime ? "text-background" : "text-foreground"}`}
        >
          All time
        </Text>
      </Pressable>
      <View className={`flex-row items-center ${allTime ? "opacity-40" : ""}`}>
        <StepButton direction="previous" disabled={!canGoPrevious} onPress={onPrevious} />
        <Text className="min-w-36 text-center font-display-medium text-base text-foreground">
          {label}
        </Text>
        <StepButton direction="next" disabled={!canGoNext} onPress={onNext} />
      </View>
    </View>
  );
}
