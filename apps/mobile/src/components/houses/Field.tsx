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
  | "autoFocus"
  | "keyboardType"
  | "autoComplete"
  | "returnKeyType"
  | "onSubmitEditing"
>) {
  const { resolvedTheme } = useTheme();
  // Inside a sheet the input must be gorhom's, or the sheet cannot lift above the keyboard.
  const Input = (inSheet ? SheetTextInput : TextInput) as typeof TextInput;
  // iOS draws a Poppins placeholder below centre in a fixed-height input, so single-line fields
  // render their own centred placeholder instead.
  const overlayPlaceholder = !multiline && !input.value ? input.placeholder : undefined;

  return (
    <View className={className}>
      <Text className="mb-3 text-sm text-foreground font-display-normal">{label}</Text>
      <View>
        <Input
          {...input}
          placeholder={multiline ? input.placeholder : undefined}
          accessibilityLabel={label}
          editable={!disabled}
          multiline={multiline}
          submitBehavior={multiline ? "blurAndSubmit" : undefined}
          placeholderTextColor={colors[resolvedTheme].mutedForeground}
          // The input itself carries the border and fill, with icon and action overlaid, so iOS
          // centres its text in a fixed-height box instead of inside a flex row. No `text-*` size
          // class: its lineHeight misaligns iOS text and caret. Multiline sets an explicit
          // lineHeight in style so placeholder and typed text share the same metrics.
          className={`rounded-2xl border border-border bg-muted px-4 text-foreground ${
            icon ? "pl-11" : ""
          } ${action ? "pr-14" : ""} ${inputClassName}`}
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
        {overlayPlaceholder ? (
          <View
            pointerEvents="none"
            className={`absolute top-0 h-[54px] justify-center ${icon ? "left-[45px]" : "left-[17px]"} ${
              action ? "right-14" : "right-4"
            }`}
          >
            <Text
              numberOfLines={1}
              className={`text-muted-foreground ${inputClassName}`}
              style={{ fontSize: 16, letterSpacing }}
            >
              {overlayPlaceholder}
            </Text>
          </View>
        ) : null}
        {icon ? (
          <View pointerEvents="none" className="absolute left-4 top-0 h-[54px] justify-center">
            {icon}
          </View>
        ) : null}
        {action ? (
          <View className="absolute right-2 top-0 h-[54px] justify-center">{action}</View>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-2 text-sm text-destructive">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
