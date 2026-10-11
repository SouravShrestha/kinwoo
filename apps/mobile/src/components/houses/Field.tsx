import { colors } from "@kinwoo/tokens/native";
import type { ComponentProps, ReactNode } from "react";
import { Text, TextInput, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { SheetTextInput } from "../BottomSheet";

type InputProps = ComponentProps<typeof TextInput>;

export function Field({
  label,
  error,
  icon,
  action,
  multiline = false,
  disabled = false,
  inSheet = false,
  className,
  inputClassName = "font-display-normal",
  letterSpacing = 0,
  ...input
}: {
  label: string;
  error?: string | null;
  icon?: ReactNode;
  action?: ReactNode;
  multiline?: boolean;
  disabled?: boolean;
  inSheet?: boolean;
  className?: string;
  inputClassName?: string;
  letterSpacing?: number;
} & Pick<
  InputProps,
  | "value"
  | "onChangeText"
  | "placeholder"
  | "maxLength"
  | "autoCapitalize"
  | "autoCorrect"
  | "keyboardType"
  | "autoComplete"
  | "returnKeyType"
  | "onSubmitEditing"
>) {
  const { resolvedTheme } = useTheme();
  // Inside a sheet the input must be gorhom's, or the sheet cannot lift above the keyboard.
  const Input = (inSheet ? SheetTextInput : TextInput) as typeof TextInput;

  return (
    <View className={className}>
      <Text className="mb-3 text-sm text-foreground font-display-normal">{label}</Text>
      <View className="flex-row items-center rounded-2xl border border-border bg-muted px-4">
        {icon ? <View className="mr-3">{icon}</View> : null}
        <Input
          {...input}
          accessibilityLabel={label}
          editable={!disabled}
          multiline={multiline}
          submitBehavior={multiline ? "blurAndSubmit" : undefined}
          placeholderTextColor={colors[resolvedTheme].mutedForeground}
          // No `text-*` size class: its lineHeight misaligns iOS text and caret. Multiline sets an
          // explicit lineHeight in style so placeholder and typed text share the same metrics.
          className={`flex-1 text-foreground ${inputClassName}`}
          style={
            multiline
              ? {
                  fontSize: 16,
                  lineHeight: 32,
                  minHeight: 54,
                  paddingTop: 14,
                  paddingBottom: 14,
                  letterSpacing,
                }
              : { fontSize: 16, height: 54, paddingVertical: 0, letterSpacing }
          }
        />
        {action ? <View className="ml-2 -mr-2">{action}</View> : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-2 text-sm text-destructive">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
