import { CODE_LENGTH } from "@kinwoo/client/auth";
import { DISPLAY_NAME_MAX_LENGTH } from "@kinwoo/core/auth";
import type { ComponentProps } from "react";

import { SheetTextInput } from "./BottomSheet";

type InputProps = ComponentProps<typeof SheetTextInput>;

export type TextFieldKind = "email" | "code" | "name";

const BASE = "rounded-2xl border border-border bg-muted px-4 text-foreground";

// Everything that differs between kinds lives here, so call sites only say
// which kind they want.
const PRESETS: Record<TextFieldKind, InputProps> = {
  email: {
    keyboardType: "email-address",
    textContentType: "emailAddress",
    autoComplete: "email",
    autoCapitalize: "none",
    autoCorrect: false,
    accessibilityLabel: "Email address",
    placeholder: "you@example.com",
    // No `text-*` size class: it also sets lineHeight, which makes iOS
    // TextInput text sit lower than the caret once you start typing.
    className: BASE,
    style: { fontSize: 18, height: 54, paddingVertical: 0 },
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
    className: `${BASE}`,
    style: { fontSize: 16, height: 54, paddingVertical: 0 },
  },
};

type TextFieldProps = {
  kind: TextFieldKind;
  value: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
  /** Extra classes, typically spacing. Appended to the preset's classes. */
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

  return (
    <SheetTextInput
      {...preset}
      value={value}
      onChangeText={onChangeText}
      editable={!disabled}
      className={className ? `${preset.className} ${className}` : preset.className}
    />
  );
}
