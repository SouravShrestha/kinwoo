import { CODE_LENGTH } from "@kinwoo/client/auth";
import { DISPLAY_NAME_MAX_LENGTH } from "@kinwoo/core/auth";
import type { InputHTMLAttributes } from "react";

export type TextFieldKind = "email" | "code" | "name";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const BASE = `h-14 w-full border border-border bg-muted px-4 ${FOCUS}`;

// Everything that differs between kinds lives here, so call sites only say
// which kind they want.
const PRESETS: Record<TextFieldKind, InputHTMLAttributes<HTMLInputElement>> = {
  email: {
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    autoCapitalize: "none",
    spellCheck: false,
    "aria-label": "Email address",
    placeholder: "you@example.com",
    className: `${BASE} rounded-lg text-base`,
  },
  code: {
    inputMode: "numeric",
    autoComplete: "one-time-code",
    maxLength: CODE_LENGTH,
    "aria-label": `${CODE_LENGTH}-digit code`,
    placeholder: "123456",
    className: `${BASE} rounded-lg text-center text-2xl tracking-[0.5em]`,
  },
  name: {
    autoComplete: "name",
    maxLength: DISPLAY_NAME_MAX_LENGTH,
    "aria-label": "Display name",
    placeholder: "Daisy",
    className: `${BASE} rounded-2xl text-base`,
  },
};

type TextFieldProps = {
  kind: TextFieldKind;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Id of the element describing the current error; omit when there is none. */
  errorId?: string;
  /** Extra classes, typically spacing. Appended to the preset's classes. */
  className?: string;
};

export function TextField({
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
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-invalid={errorId ? true : undefined}
      aria-describedby={errorId}
      className={className ? `${preset.className} ${className}` : preset.className}
    />
  );
}
