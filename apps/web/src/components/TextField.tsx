import { CODE_LENGTH } from "@kinwoo/client/auth";
import { DISPLAY_NAME_MAX_LENGTH } from "@kinwoo/core/auth";
import type { InputHTMLAttributes } from "react";

export type TextFieldKind = "email" | "code" | "name";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const BASE = `h-[54px] w-full rounded-2xl border border-border bg-muted px-4 text-foreground placeholder:text-muted-foreground ${FOCUS}`;

const PRESETS: Record<TextFieldKind, InputHTMLAttributes<HTMLInputElement>> = {
  email: {
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    autoCapitalize: "none",
    spellCheck: false,
    "aria-label": "Email address",
    placeholder: "you@example.com",
    className: `${BASE} text-lg tracking-normal`,
  },
  code: {
    inputMode: "numeric",
    autoComplete: "one-time-code",
    maxLength: CODE_LENGTH,
    "aria-label": `${CODE_LENGTH}-digit code`,
    placeholder: "123456",
    className: `${BASE} text-center text-base tracking-[8px]`,
  },
  name: {
    autoComplete: "name",
    maxLength: DISPLAY_NAME_MAX_LENGTH,
    "aria-label": "Display name",
    placeholder: "Daisy",
    className: `${BASE} text-base`,
  },
};

type TextFieldProps = {
  id?: string;
  kind: TextFieldKind;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  errorId?: string;
  className?: string;
};

export function TextField({
  id,
  kind,
  value,
  onChange,
  disabled = false,
  errorId,
  className,
}: TextFieldProps) {
  const preset = PRESETS[kind];

  return (
    <input
      {...preset}
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-invalid={errorId ? true : undefined}
      aria-describedby={errorId}
      className={className ? `${preset.className} ${className}` : preset.className}
    />
  );
}
