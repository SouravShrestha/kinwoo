import { DISPLAY_NAME_MAX_LENGTH } from "@kinwoo/core/auth";
import { useEffect, useRef, type ComponentProps, type ComponentRef } from "react";

import { useTheme } from "@/theme/ThemeProvider";

import { SheetTextInput, useSheetPresented } from "./BottomSheet";

type InputProps = ComponentProps<typeof SheetTextInput>;

export type TextFieldKind = "email" | "name";

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
  autoFocus?: boolean;
  /** Focus once presented and take focus back whenever it leaves. */
  keepFocus?: boolean;
  className?: string;
};

export function TextField({
  kind,
  value,
  onChangeText,
  disabled = false,
  autoFocus,
  keepFocus = false,
  className,
}: TextFieldProps) {
  const preset = PRESETS[kind];
  const { resolvedTheme, colors } = useTheme();
  const inputRef = useRef<ComponentRef<typeof SheetTextInput>>(null);
  const presented = useSheetPresented();

  const wantsFocus = presented && (autoFocus || (keepFocus && !disabled));
  useEffect(() => {
    if (wantsFocus) inputRef.current?.focus();
  }, [wantsFocus]);

  return (
    <SheetTextInput
      ref={inputRef}
      {...preset}
      // No className hook for the placeholder; the native default ignores the in-app theme.
      placeholderTextColor={colors[resolvedTheme].mutedForeground}
      selectionColor={colors[resolvedTheme].primary}
      value={value}
      onChangeText={onChangeText}
      onBlur={keepFocus ? () => inputRef.current?.focus() : undefined}
      editable={!disabled}
      className={className ? `${preset.className} ${className}` : preset.className}
    />
  );
}
