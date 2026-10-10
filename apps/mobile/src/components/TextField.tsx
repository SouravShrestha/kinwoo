import { CODE_LENGTH } from "@kinwoo/client/auth";
import { DISPLAY_NAME_MAX_LENGTH } from "@kinwoo/core/auth";
import { colors } from "@kinwoo/tokens/native";
import type { ComponentProps } from "react";

import { useTheme } from "@/theme/ThemeProvider";

import { SheetTextInput } from "./BottomSheet";

type InputProps = ComponentProps<typeof SheetTextInput>;

export type TextFieldKind = "email" | "code" | "name";

const BASE = "rounded-2xl border border-border bg-muted px-4 text-foreground";

const PRESETS: Record<TextFieldKind, InputProps> = {
  email: {
    keyboardType: "email-address",
    textContentType: "emailAddress",
    autoComplete: "email",
    autoCapitalize: "none",
    autoCorrect: false,
    accessibilityLabel: "Email address",
    placeholder: "you@example.com",
    // No `text-*` size class: its lineHeight misaligns iOS text and caret. letterSpacing is
    // explicit because the code field's tracking leaks into placeholders when iOS recycles views.
    className: BASE,
    style: { fontSize: 18, height: 54, paddingVertical: 0, letterSpacing: 0 },
  },
  code: {
    keyboardType: "number-pad",
    textContentType: "oneTimeCode",
    autoComplete: "sms-otp",
    maxLength: CODE_LENGTH,
    accessibilityLabel: `${CODE_LENGTH}-digit code`,
    placeholder: "123456",
    className: `${BASE} text-center tracking-[8px]`,
    style: { fontSize: 16, height: 54, paddingVertical: 0 },
  },
  name: {
    maxLength: DISPLAY_NAME_MAX_LENGTH,
    autoCapitalize: "words",
    autoCorrect: false,
    accessibilityLabel: "Display name",
    placeholder: "Daisy",
    className: BASE,
    style: { fontSize: 16, height: 54, paddingVertical: 0, letterSpacing: 0 },
  },
};

type TextFieldProps = {
  kind: TextFieldKind;
  value: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function TextField({
  kind,
  value,
  onChangeText,
  disabled = false,
  className,
}: TextFieldProps) {
  const preset = PRESETS[kind];
  const { resolvedTheme } = useTheme();

  return (
    <SheetTextInput
      {...preset}
      // No className hook for the placeholder; the native default ignores the in-app theme.
      placeholderTextColor={colors[resolvedTheme].mutedForeground}
      value={value}
      onChangeText={onChangeText}
      editable={!disabled}
      className={className ? `${preset.className} ${className}` : preset.className}
    />
  );
}
