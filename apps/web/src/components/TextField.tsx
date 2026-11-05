import { DISPLAY_NAME_MAX_LENGTH } from "@kinwoo/core/auth";
import { useEffect, useRef, type InputHTMLAttributes } from "react";

export type TextFieldKind = "email" | "name";

// No focus ring, matching mobile: the caret shows focus. outline-hidden keeps one in forced-colors mode.
const BASE =
  "h-[54px] w-full rounded-2xl border border-border bg-muted px-4 text-foreground placeholder:text-muted-foreground outline-hidden";

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
  autoFocus?: boolean;
  /** Focus now and take focus back whenever it leaves. */
  keepFocus?: boolean;
  errorId?: string;
  className?: string;
};

export function TextField({
  id,
  kind,
  value,
  onChange,
  disabled = false,
  autoFocus,
  keepFocus = false,
  errorId,
  className,
}: TextFieldProps) {
  const preset = PRESETS[kind];
  const inputRef = useRef<HTMLInputElement>(null);

  // Not the native attribute: that focuses with a page scroll, which jerks a sliding sheet.
  // Re-runs when a kept field is re-enabled: disabling it drops focus.
  const wantsFocus = autoFocus || (keepFocus && !disabled);
  useEffect(() => {
    if (wantsFocus) inputRef.current?.focus({ preventScroll: true });
  }, [wantsFocus]);

  return (
    <input
      ref={inputRef}
      {...preset}
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      // Next frame: refocusing inside blur is ignored while focus is still moving.
      onBlur={
        keepFocus
          ? () => requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
          : undefined
      }
      disabled={disabled}
      aria-invalid={errorId ? true : undefined}
      aria-describedby={errorId}
      className={className ? `${preset.className} ${className}` : preset.className}
    />
  );
}
