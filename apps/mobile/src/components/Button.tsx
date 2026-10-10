import { colors } from "@kinwoo/tokens/native";
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "@/theme/ThemeProvider";

export type ButtonVariant = "primary" | "outline" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  className,
  ...rest
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
} & Omit<PressableProps, "onPress" | "disabled" | "children" | "className">) {
  const { resolvedTheme } = useTheme();
  const isDisabled = disabled || loading;

  const container =
    variant === "primary"
      ? "bg-primary"
      : variant === "outline"
        ? "border border-border bg-background"
        : "bg-transparent";

  const text =
    variant === "primary"
      ? "text-primary-foreground"
      : variant === "ghost"
        ? "text-muted-foreground"
        : "text-foreground";

  // ActivityIndicator ignores className colour; its dark default vanishes on the primary background.
  const spinnerColor = variant === "primary" ? colors[resolvedTheme].primaryForeground : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      className={[
        "h-14 flex-row items-center justify-center rounded-xl px-5",
        container,
        isDisabled ? "opacity-50" : "active:opacity-80",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon ? <View className="mr-2.5">{icon}</View> : null}
          <Text className={`font-medium text-base ${text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
