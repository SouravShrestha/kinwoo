"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Field({
  label,
  error,
  icon,
  action,
  className,
  inputClassName,
  onValueChange,
  ...input
}: {
  label: string;
  error?: string | null;
  icon?: ReactNode;
  action?: ReactNode;
  inputClassName?: string;
  onValueChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-3 block font-display text-sm font-normal text-foreground">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {icon}
          </span>
        ) : null}
        <input
          {...input}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(
            "h-[54px] w-full rounded-2xl border border-border bg-muted px-4",
            "font-display text-base font-normal tracking-normal placeholder:text-muted-foreground",
            icon && "pl-11",
            action && "pr-14",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            inputClassName,
          )}
        />
        {action ? <div className="absolute right-2 top-1/2 -translate-y-1/2">{action}</div> : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
