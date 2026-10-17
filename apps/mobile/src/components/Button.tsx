import { useBusyWhile } from "@kinwoo/client/activity";
import { Text, View, type PressableProps } from "react-native";
import type { ReactNode } from "react";

import { Pressable } from "./Pressable";

export type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "destructive";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  allowDoublePress = false,
  icon,
  iconClassName = "mr-2.5",
  iconEnd,
  iconEndClassName = "ml-2.5",
  labelWeight = "medium",
  className,
  ...rest
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  allowDoublePress?: boolean;
  icon?: ReactNode;
  iconClassName?: string;
  iconEnd?: ReactNode;
  iconEndClassName?: string;
  labelWeight?: "normal" | "medium";
  className?: string;
} & Omit<PressableProps, "onPress" | "disabled" | "children" | "className">) {
  const isDisabled = disabled || loading;
  useBusyWhile(loading);

  // Outline and destructive stay transparent so they take on the surface they sit on, page or sheet.
  const container =
    variant === "primary"
      ? "bg-primary"
      : variant === "accent"
        ? "bg-accent"
        : variant === "outline"
          ? "border border-border bg-transparent"
          : variant === "destructive"
            ? "border border-destructive bg-transparent"
            : "bg-transparent";

  const text =
    variant === "primary"
      ? "text-primary-foreground"
      : variant === "accent"
        ? "text-accent-foreground"
        : variant === "ghost"
          ? "text-muted-foreground"
          : variant === "destructive"
            ? "text-destructive"
            : "text-foreground";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      allowDoublePress={allowDoublePress}
      disabled={isDisabled}
      className={[
        "h-14 flex-row items-center justify-center rounded-xl px-5",
        container,
        isDisabled ? "opacity-50" : "active:opacity-80",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {icon ? <View className={iconClassName}>{icon}</View> : null}
      <Text
        className={`${labelWeight === "normal" ? "font-display-normal" : "font-display-medium"} text-base ${text}`}
      >
        {label}
      </Text>
      {iconEnd ? <View className={iconEndClassName}>{iconEnd}</View> : null}
    </Pressable>
  );
}
